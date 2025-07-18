import type { Context } from 'hono';
import { sign } from 'hono/jwt';
import { getConnInfo } from 'hono/bun';
import { authService } from './auth.service';
import { AnomalyService } from './anomaly.service';
import { SessionService } from './session.service';
import { config } from '../utils/env';

export class AuthController {
  static async login(c: Context) {
    try {
      // Safely get IP address with fallback for test environment
      let ipAddress = 'unknown';
      try {
        const connInfo = getConnInfo(c);
        ipAddress = connInfo.remote.address || 'unknown';
      } catch (error) {
        // Fallback for test environment or when getConnInfo fails
        ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
      }

      // Check if IP is blocked before processing
      const isIpBlocked = await AnomalyService.isIpBlocked(ipAddress);
      if (isIpBlocked) {
        return c.json({ 
          error: "IP address is blocked due to excessive failed login attempts" 
        }, 403);
      }

      const body = await c.req.json();
      const { login_indentity, password } = body;

      // For simplicity, assume login_identity is email
      const loginResult = await authService.loginUser(login_indentity, password);

      if (!loginResult.success) {
        // Try to get user ID for user-level tracking, even if login failed
        let userId: string | undefined;
        let userFailedAttempts = 0;
        try {
          const userResult = await authService.getUserByEmail(login_indentity);
          if (userResult.success && userResult.data) {
            userId = userResult.data.id;
            // Get current failed attempts count before recording this one
            userFailedAttempts = await AnomalyService.getUserFailedAttempts(userId!);
          }
        } catch (error) {
          // User doesn't exist, continue with IP-only tracking
        }

        // Record failed attempt (both user-level and IP-level tracking)
        await AnomalyService.recordFailedLoginAttempt(c, userId);

        if (userId && userFailedAttempts >= 5) {
          return c.json({ error: "Account Suspended!" }, 401);
        }

        return c.json({ error: loginResult.message }, 401);
      }

      const user = loginResult.data!;

      // Check if user is suspended before successful login
      const isUserSuspended = await AnomalyService.isUserSuspended(user.id);
      if (isUserSuspended) {
        return c.json({ 
          error: "User temporarily suspended due to too many failed login attempts" 
        }, 429);
      }

      // Create session for the user
      const sessionResult = await SessionService.createSession(user.id);
      if (!sessionResult.success) {
        return c.json({ error: 'Failed to create session' }, 500);
      }

      // Generate JWT token with claim_token for session management
      const payload = {
        sub: user.id,
        email: user.email,
        claim_token: sessionResult.data!.claimToken,
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      };

      const token = await sign(payload, config.JWT_SECRET);

      return c.json({
        message: 'Login successful',
        token,
      });

    } catch (error) {
      console.error('Login error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }

  static async register(c: Context) {
    try {
      const body = await c.req.json();
      const { email, username, password } = body;

      const result = await authService.registerUser(email, username, password);

      if (!result.success) {
        return c.json({ error: result.message }, 400);
      }

      return c.json({
        message: result.message,
        user: result.data
      }, 201);

    } catch (error) {
      console.error('Registration error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }

  static async logout(c: Context) {
    try {
      const session = c.get("session");

      // Invalidate session if claim_token exists
      if (session.claim_token) {
        const result = await SessionService.invalidateSession(session.claim_token);
        if (!result.success) {
          return c.json({ error: 'Failed to logout' }, 500);
        }
      }

      return c.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }

  static async getCurrentUser(c: Context) {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }
      // Get user details
      const userResult = await authService.getUserById(user.id);
      if (!userResult.success) {
        return c.json({ error: 'User not found' }, 404);
      }

      return c.json(userResult.data);

    } catch (error) {
      console.error('Get current user error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
}

export class AdminController {
  static async getAllUsers(c: Context) {
    try {
      const result = await authService.getAllUsers();
      
      if (!result.success) {
        return c.json({ error: result.message }, 500);
      }

      return c.json({
        message: result.message,
        users: result.data
      });

    } catch (error) {
      console.error('Get users error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }

  static async getAnomalies(c: Context) {
    try {
      const result = await AnomalyService.getAllAnomalies();
      
      if (!result.success) {
        return c.json({ error: 'Failed to retrieve anomalies' }, 500);
      }

      return c.json({
        message: 'Anomalies retrieved successfully',
        anomalies: result.data
      });

    } catch (error) {
      console.error('Get anomalies error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }

  static async getAnomalyStats(c: Context) {
    try {
      const result = await AnomalyService.getAnomalyStats();
      
      if (!result.success) {
        return c.json({ error: 'Failed to retrieve anomaly stats' }, 500);
      }

      return c.json({
        message: 'Anomaly stats retrieved successfully',
        stats: result.data
      });

    } catch (error) {
      console.error('Get anomaly stats error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
}
