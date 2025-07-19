import { DB } from '../libs/db';
import { CacheClient } from '../libs/cache';
import infoLogs, { LogTypes } from '../libs/logger';
import type { Context } from 'hono';
import crypto from 'node:crypto';

export class AnomalyService {
  private static readonly USER_ATTEMPT_THRESHOLD = 5;
  private static readonly IP_ATTEMPT_THRESHOLD = 100;
  private static readonly IP_LOCKOUT_MINUTES = 5; // Changed to 5 minutes as per assignment
  private static readonly USER_LOCKOUT_MINUTES = 15;

  static async recordFailedLoginAttempt(c: Context, userId?: string) {
    try {
      const db = await DB.getInstance();
      
      // Safely get IP address with fallback for test environment
      let ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';

      // Handle IP rate limiting - create a new key for every request
      const currentTimestamp = Date.now();
      const ipRateLimitKey = `ip_ratelimit:${ipAddress}:${currentTimestamp}`;
      
      // Create a new key for this request with IP_LOCKOUT_MINUTES TTL
      await CacheClient.set(ipRateLimitKey, '1', this.IP_LOCKOUT_MINUTES * 60);
      
      // Count how many keys exist for this IP
      const ipKeys = await CacheClient.keys(`ip_ratelimit:${ipAddress}:*`);
      const ipAttempts = ipKeys.length;
      
      // Check if IP should be permanently blocked
      let ipBlocked = false;
      if (ipAttempts >= this.IP_ATTEMPT_THRESHOLD) {
        // Check if already permanently blocked
        const existingBlock = await this.checkPermanentIpBlock(ipAddress);
        if (!existingBlock) {
          // Record permanent IP block in database
          await db.insertInto('anomalies').values({
            id: crypto.randomUUID(),
            user_id: null, // null user_id indicates permanent IP block
            ip_address: ipAddress,
            anomaly_type: 'ip_ratelimited',
            created_at: new Date(),
            updated_at: new Date()
          }).execute();
          
          infoLogs(`IP ${ipAddress} permanently blocked after ${ipAttempts} attempts in 5-minute window`, LogTypes.LOGS, 'AnomalyService');
        }
        ipBlocked = true;
      } else {
        // Check if IP was already permanently blocked
        ipBlocked = await this.checkPermanentIpBlock(ipAddress);
      }

      // Handle user-level rate limiting - create a new key for every request
      let userSuspended = false;
      if (userId) {
        const userRateLimitKey = `user_ratelimit:${userId}:${currentTimestamp}`;
        
        // Create a new key for this user request with 15-minute TTL
        await CacheClient.set(userRateLimitKey, '1', this.USER_LOCKOUT_MINUTES * 60);
        
        // Count how many keys exist for this user
        const userKeys = await CacheClient.keys(`user_ratelimit:${userId}:*`);
        const userAttempts = userKeys.length;
        
        // Check if user should be suspended
        if (userAttempts >= this.USER_ATTEMPT_THRESHOLD) {
          // Record user suspension in database
          await db.insertInto('anomalies').values({
            id: crypto.randomUUID(),
            user_id: userId,
            ip_address: ipAddress,
            anomaly_type: 'user_login_ratelimited',
            created_at: new Date(),
            updated_at: new Date()
          }).execute();
          
          userSuspended = true;
          infoLogs(`User ${userId} suspended after ${userAttempts} attempts in 15-minute window`, LogTypes.LOGS, 'AnomalyService');
        }
      }

      infoLogs(
        `Failed login attempt recorded. User: ${userId || 'unknown'}, IP: ${ipAddress} (${ipAttempts} attempts in window), UserSuspended: ${userSuspended}, IpBlocked: ${ipBlocked}`,
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
      // Count Redis keys for this user instead of database queries
      const userKeys = await CacheClient.keys(`user_ratelimit:${userId}:*`);
      return userKeys.length;
    } catch (error) {
      infoLogs(`Error checking user failed attempts: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return 0;
    }
  }

  static async isUserSuspended(userId: string): Promise<boolean> {
    try {
      // Check current rate limit by counting keys in Redis
      const userKeys = await CacheClient.keys(`user_ratelimit:${userId}:*`);
      const attemptCount = userKeys.length;
      const isSuspended = attemptCount >= this.USER_ATTEMPT_THRESHOLD;
      
      if (isSuspended) {
        infoLogs(`User ${userId} is suspended. Current attempts: ${attemptCount}`, LogTypes.LOGS, 'AnomalyService');
      }

      return isSuspended;
    } catch (error) {
      infoLogs(`Error checking user suspension: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return false;
    }
  }

  static async isIpBlocked(ipAddress: string): Promise<boolean> {
    try {
      // First check if IP is permanently blocked in database
      const permanentBlock = await this.checkPermanentIpBlock(ipAddress);
      if (permanentBlock) {
        infoLogs(`IP ${ipAddress} is permanently blocked`, LogTypes.LOGS, 'AnomalyService');
        return true;
      }

      // Then check current rate limit by counting keys in Redis
      const ipKeys = await CacheClient.keys(`ip_ratelimit:${ipAddress}:*`);
      const attemptCount = ipKeys.length;
      
      const isBlocked = attemptCount >= this.IP_ATTEMPT_THRESHOLD;
      
      if (isBlocked) {
        infoLogs(`IP ${ipAddress} is blocked. Current attempts: ${attemptCount}`, LogTypes.LOGS, 'AnomalyService');
      }

      return isBlocked;
    } catch (error) {
      infoLogs(`Error checking IP block: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return false;
    }
  }

  private static async checkPermanentIpBlock(ipAddress: string): Promise<boolean> {
    try {
      const db = await DB.getInstance();
      
      const permanentBlock = await db
        .selectFrom('anomalies')
        .select(['id'])
        .where('ip_address', '=', ipAddress)
        .where('anomaly_type', '=', 'ip_ratelimited') // Use existing type for permanent blocks
        .where('user_id', 'is', null) // Permanent blocks have no user_id
        .limit(1)
        .execute();

      return permanentBlock.length > 0;
    } catch (error) {
      infoLogs(`Error checking permanent IP block: ${error}`, LogTypes.ERROR, 'AnomalyService');
      return false;
    }
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
      const cutoffTime = new Date(Date.now() - this.USER_LOCKOUT_MINUTES * 60 * 1000); // Use 15 minutes for stats

      const recentAnomalies = await db
        .selectFrom('anomalies')
        .select(['user_id', 'ip_address', 'anomaly_type'])
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
          blocked_ips: recentAnomalies.filter(a => a.anomaly_type === 'ip_ratelimited').length,
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
