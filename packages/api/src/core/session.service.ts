import { randomBytes, randomUUID } from 'crypto';
import { DB } from '../libs/db';

export class SessionService {
  /**
   * Create a new session for a user
   */
  static async createSession(userId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const claimToken = randomBytes(32).toString('hex');
      const sessionId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

      const session = {
        id: sessionId,
        user_id: userId,
        claim_token: claimToken,
        last_claimed_at: now,
        expires_at: expiresAt,
        is_active: true,
        created_at: now,
        updated_at: now
      };

      const db = await DB.getInstance();
      await db
        .insertInto('sessions')
        .values(session)
        .execute();

      return {
        success: true,
        data: {
          sessionId,
          claimToken,
          expiresAt
        },
        message: 'Session created successfully'
      };

    } catch (error) {
      console.error('Session creation error:', error);
      return {
        success: false,
        message: 'Failed to create session'
      };
    }
  }

  /**
   * Validate a session by claim token
   */
  static async validateSession(claimToken: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const db = await DB.getInstance();
      const session = await db
        .selectFrom('sessions')
        .selectAll()
        .where('claim_token', '=', claimToken)
        .where('is_active', '=', true)
        .where('expires_at', '>', new Date())
        .executeTakeFirst();

      if (!session) {
        return {
          success: false,
          message: 'Invalid or expired session'
        };
      }

      // Update last claimed time
      await db
        .updateTable('sessions')
        .set({
          last_claimed_at: new Date(),
          updated_at: new Date()
        })
        .where('id', '=', session.id)
        .execute();

      return {
        success: true,
        data: session,
        message: 'Session is valid'
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return {
        success: false,
        message: 'Failed to validate session'
      };
    }
  }

  /**
   * Invalidate a session (logout)
   */
  static async invalidateSession(claimToken: string): Promise<{ success: boolean; message?: string }> {
    try {
      const db = await DB.getInstance();
      const result = await db
        .updateTable('sessions')
        .set({
          is_active: false,
          updated_at: new Date()
        })
        .where('claim_token', '=', claimToken)
        .where('is_active', '=', true)
        .execute();

      if (result.length === 0) {
        return {
          success: false,
          message: 'Session not found or already inactive'
        };
      }

      return {
        success: true,
        message: 'Session invalidated successfully'
      };

    } catch (error) {
      console.error('Session invalidation error:', error);
      return {
        success: false,
        message: 'Failed to invalidate session'
      };
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  static async invalidateAllUserSessions(userId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const db = await DB.getInstance();
      await db
        .updateTable('sessions')
        .set({
          is_active: false,
          updated_at: new Date()
        })
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      return {
        success: true,
        message: 'All user sessions invalidated successfully'
      };

    } catch (error) {
      console.error('Session invalidation error:', error);
      return {
        success: false,
        message: 'Failed to invalidate user sessions'
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<{ success: boolean; message?: string }> {
    try {
      const db = await DB.getInstance();
      await db
        .updateTable('sessions')
        .set({
          is_active: false,
          updated_at: new Date()
        })
        .where('expires_at', '<', new Date())
        .where('is_active', '=', true)
        .execute();

      return {
        success: true,
        message: 'Expired sessions cleaned up successfully'
      };

    } catch (error) {
      console.error('Session cleanup error:', error);
      return {
        success: false,
        message: 'Failed to cleanup expired sessions'
      };
    }
  }
}
