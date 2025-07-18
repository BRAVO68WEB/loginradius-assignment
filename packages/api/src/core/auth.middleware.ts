import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { SessionService } from './session.service';
import { authService } from './auth.service';
import { config } from '../utils/env';

/**
 * Authentication middleware - validates JWT and session
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    let payload: any;
    try {
      payload = await verify(token, config.JWT_SECRET);
    } catch (error) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Validate session if claim_token is present
    if (payload.claim_token) {
      const sessionResult = await SessionService.validateSession(payload.claim_token);
      
      if (!sessionResult.success) {
        return c.json({ error: 'Invalid or expired session' }, 401);
      }

      // Check if session belongs to the user
      if (sessionResult.data!.user_id !== payload.sub) {
        return c.json({ error: 'Session mismatch' }, 401);
      }

      c.set("session", {
        id: sessionResult.data!.id,
        claimToken: payload.claim_token
      });
    }

    // Get user details
    const userResult = await authService.getUserById(payload.sub);
    if (!userResult.success) {
      return c.json({ error: 'User not found' }, 401);
    }

    const user = userResult.data!;
    
    // Check if user is active
    if (!user.is_active) {
      return c.json({ error: 'Account is inactive' }, 401);
    }

    // Set user context
    c.set("user", {
      id: user.id,
      email: user.email,
      role: user.role
    });

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
}

/**
 * Admin authorization middleware - requires admin role
 */
export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
}

/**
 * Combined auth + admin middleware
 */
export async function requireAdmin(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    let payload: any;
    try {
      payload = await verify(token, config.JWT_SECRET);
    } catch (error) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Validate session if claim_token is present
    if (payload.claim_token) {
      const sessionResult = await SessionService.validateSession(payload.claim_token);
      
      if (!sessionResult.success) {
        return c.json({ error: 'Invalid or expired session' }, 401);
      }

      // Check if session belongs to the user
      if (sessionResult.data!.user_id !== payload.sub) {
        return c.json({ error: 'Session mismatch' }, 401);
      }

      c.set("session", {
        id: sessionResult.data!.id,
        claimToken: payload.claim_token
      });
    }

    // Get user details
    const userResult = await authService.getUserById(payload.sub);
    if (!userResult.success) {
      return c.json({ error: 'User not found' }, 401);
    }

    const user = userResult.data!;
    
    // Check if user is active
    if (!user.is_active) {
      return c.json({ error: 'Account is inactive' }, 401);
    }

    // Set user context
    c.set("user", {
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Check admin role
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    await next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
}