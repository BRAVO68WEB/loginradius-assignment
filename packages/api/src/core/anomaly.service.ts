import { DB } from '../libs/db';
import infoLogs, { LogTypes } from '../libs/logger';
import type { Context } from 'hono';
import { getConnInfo } from 'hono/bun';
import crypto from 'node:crypto';

export class AnomalyService {
  private static readonly USER_ATTEMPT_THRESHOLD = 5;
  private static readonly IP_ATTEMPT_THRESHOLD = 100;
  private static readonly TIME_WINDOW_MINUTES = 15;
  private static readonly USER_LOCKOUT_MINUTES = 15;
  private static readonly IP_LOCKOUT_MINUTES = 30;

  static async recordFailedLoginAttempt(c: Context, userId?: string) {
    try {
      const db = await DB.getInstance();
      
      // Safely get IP address with fallback for test environment
      let ipAddress = 'unknown';
      try {
        const connInfo = getConnInfo(c);
        ipAddress = connInfo.remote.address || 'unknown';
      } catch (error) {
        // Fallback for test environment or when getConnInfo fails
        ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
      }

      // Determine anomaly type based on context
      const anomalyType = userId ? 'user_login_ratelimited' : 'ip_ratelimited';

      // Record the anomaly in database
      await db.insertInto('anomalies').values({
        id: crypto.randomUUID(),
        user_id: userId || null,
        ip_address: ipAddress,
        anomaly_type: anomalyType,
        created_at: new Date(),
        updated_at: new Date()
      }).execute();

      // Check if user should be suspended (only if userId provided)
      let userSuspended = false;
      if (userId) {
        userSuspended = await this.checkUserSuspension(userId);
      }

      // Check if IP should be blocked
      const ipBlocked = await this.checkIpBlock(ipAddress);

      infoLogs(
        `Failed login attempt recorded. User: ${userId || 'unknown'}, IP: ${ipAddress}, UserSuspended: ${userSuspended}, IpBlocked: ${ipBlocked}`,
        LogTypes.LOGS,
        'AnomalyService'
      );

      return { userSuspended, ipBlocked };
    } catch (error) {
      infoLogs(`Error recording failed login attempt: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return { userSuspended: false, ipBlocked: false };
    }
  }

  static async getUserFailedAttempts(userId: string): Promise<number> {
    try {
      const db = await DB.getInstance();
      const cutoffTime = new Date(Date.now() - this.TIME_WINDOW_MINUTES * 60 * 1000);

      const failedAttempts = await db
        .selectFrom('anomalies')
        .select(['id'])
        .where('user_id', '=', userId)
        .where('anomaly_type', '=', 'user_login_ratelimited')
        .where('created_at', '>=', cutoffTime)
        .execute();

      return failedAttempts.length;
    } catch (error) {
      infoLogs(`Error checking user failed attempts: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return 0;
    }
  }

  static async isUserSuspended(userId: string): Promise<boolean> {
    try {
      const failedAttempts = await this.getUserFailedAttempts(userId);
      const isSuspended = failedAttempts >= this.USER_ATTEMPT_THRESHOLD;
      
      if (isSuspended) {
        infoLogs(`User ${userId} is suspended. Failed attempts: ${failedAttempts}`, LogTypes.LOGS, 'AnomalyService');
      }

      return isSuspended;
    } catch (error) {
      infoLogs(`Error checking user suspension: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return false;
    }
  }

  static async isIpBlocked(ipAddress: string): Promise<boolean> {
    try {
      const db = await DB.getInstance();
      const cutoffTime = new Date(Date.now() - this.TIME_WINDOW_MINUTES * 60 * 1000);

      // Count both types of anomalies for IP blocking
      const failedAttempts = await db
        .selectFrom('anomalies')
        .select(['id'])
        .where('ip_address', '=', ipAddress)
        .where('created_at', '>=', cutoffTime)
        .execute();

      const isBlocked = failedAttempts.length >= this.IP_ATTEMPT_THRESHOLD;
      
      if (isBlocked) {
        infoLogs(`IP ${ipAddress} is blocked. Failed attempts: ${failedAttempts.length}`, LogTypes.LOGS, 'AnomalyService');
      }

      return isBlocked;
    } catch (error) {
      infoLogs(`Error checking IP block: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return false;
    }
  }

  private static async checkUserSuspension(userId: string): Promise<boolean> {
    const db = await DB.getInstance();
    const cutoffTime = new Date(Date.now() - this.TIME_WINDOW_MINUTES * 60 * 1000);

    const failedAttempts = await db
      .selectFrom('anomalies')
      .select(['id'])
      .where('user_id', '=', userId)
      .where('anomaly_type', '=', 'user_login_ratelimited')
      .where('created_at', '>=', cutoffTime)
      .execute();

    return failedAttempts.length >= this.USER_ATTEMPT_THRESHOLD;
  }

  private static async checkIpBlock(ipAddress: string): Promise<boolean> {
    const db = await DB.getInstance();
    const cutoffTime = new Date(Date.now() - this.TIME_WINDOW_MINUTES * 60 * 1000);

    const failedAttempts = await db
      .selectFrom('anomalies')
      .select(['id'])
      .where('ip_address', '=', ipAddress)
      .where('created_at', '>=', cutoffTime)
      .execute();

    return failedAttempts.length >= this.IP_ATTEMPT_THRESHOLD;
  }

  // Admin utility methods
  static async getAllAnomalies() {
    try {
      const db = await DB.getInstance();
      const anomalies = await db
        .selectFrom('anomalies')
        .selectAll()
        .orderBy('created_at', 'desc')
        .execute();

      return {
        success: true,
        data: anomalies
      };
    } catch (error) {
      infoLogs(`Error retrieving anomalies: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return {
        success: false,
        data: []
      };
    }
  }

  static async getAnomalyStats() {
    try {
      const db = await DB.getInstance();
      const cutoffTime = new Date(Date.now() - this.TIME_WINDOW_MINUTES * 60 * 1000);

      const recentAnomalies = await db
        .selectFrom('anomalies')
        .select(['user_id', 'ip_address'])
        .where('created_at', '>=', cutoffTime)
        .execute();

      const allAnomalies = await db
        .selectFrom('anomalies')
        .select(['user_id', 'ip_address'])
        .execute();

      const uniqueUsers = new Set(allAnomalies.filter(a => a.user_id).map(a => a.user_id)).size;
      const uniqueIPs = new Set(allAnomalies.map(a => a.ip_address)).size;

      return {
        success: true,
        data: {
          total_recent_attempts: recentAnomalies.length,
          unique_users_affected: uniqueUsers,
          unique_ips_involved: uniqueIPs,
          time_window_minutes: this.TIME_WINDOW_MINUTES
        }
      };
    } catch (error) {
      infoLogs(`Error retrieving anomaly stats: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return {
        success: false,
        data: null
      };
    }
  }
}

export const anomalyService = new AnomalyService();
