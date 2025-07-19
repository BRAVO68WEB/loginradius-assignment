import { DB } from '../libs/db';
import infoLogs, { LogTypes } from '../libs/logger';
import crypto from 'node:crypto';

// Helper for credential operations (same as existing pattern)
const credHelper = {
    async isValidPassword(password: string, hash: string, salt: string) {
        const hashedInput = crypto.createHmac('sha256', salt)
            .update(password)
            .digest('hex');
        return hashedInput === hash;
    },
    async generateHashAndSalt(password: string) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.createHmac('sha256', salt)
            .update(password)
            .digest('hex');
        return { hash, salt };
    }
};

export class AuthService {
  constructor() {}

  async loginUser(email: string, password: string) {
    try {
      const db = await DB.getInstance();
      
      const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'username', 'full_name', 'role', 'is_active', 'created_at', 'hash', 'salt'])
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        infoLogs(`Login attempt for non-existent user: ${email}`, LogTypes.LOGS, 'AuthService');
        return {
          success: false,
          message: 'Invalid credentials',
          data: null
        };
      }

      const isPasswordValid = await credHelper.isValidPassword(password, user.hash, user.salt);

      if (!isPasswordValid) {
        infoLogs(`Invalid password for user: ${email}`, LogTypes.LOGS, 'AuthService');
        return {
          success: false,
          message: 'Invalid credentials',
          data: null
        };
      }

      infoLogs(`Successful login for user: ${email}`, LogTypes.LOGS, 'AuthService');
      return {
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          created_at: user.created_at
        }
      };
    } catch (error) {
      infoLogs(`Error during login: ${error}`, LogTypes.ERROR, 'AuthService');
      return {
        success: false,
        message: 'Internal server error',
        data: null
      };
    }
  }

  async registerUser(email: string, username: string, password: string) {
    try {
      const db = await DB.getInstance();
      
      // Check if user already exists
      const existingUserByEmail = await db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();

      const existingUserByUsername = await db
        .selectFrom('users')
        .select('id')
        .where('username', '=', username)
        .executeTakeFirst();

      if (existingUserByEmail || existingUserByUsername) {
        return {
          success: false,
          message: 'User already exists',
          data: null
        };
      }

      const { hash, salt } = await credHelper.generateHashAndSalt(password);

      const newUser = await db
        .insertInto('users')
        .values({
          id: crypto.randomUUID(),
          email,
          username,
          hash,
          salt,
          is_active: true,
          is_deleted: false,
          role: 'user',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning(['id', 'email', 'username', 'created_at'])
        .executeTakeFirst();

      infoLogs(`User registered successfully: ${email}`, LogTypes.LOGS, 'AuthService');
      return {
        success: true,
        message: 'User registered successfully',
        data: newUser
      };
    } catch (error) {
      infoLogs(`Error during registration: ${error}`, LogTypes.ERROR, 'AuthService');
      return {
        success: false,
        message: 'Internal server error',
        data: null
      };
    }
  }

  async getAllUsers() {
    try {
      const db = await DB.getInstance();
      
      const users = await db
        .selectFrom('users')
        .select(['id', 'email', 'username', 'full_name', 'role', 'is_active', 'created_at'])
        .where('is_deleted', '=', false)
        .execute();

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: users
      };
    } catch (error) {
      infoLogs(`Error retrieving users: ${error}`, LogTypes.ERROR, 'AuthService');
      return {
        success: false,
        message: 'Internal server error',
        data: null
      };
    }
  }

  async getUserById(userId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const db = await DB.getInstance();
      
      const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'username', 'full_name', 'role', 'is_active', 'created_at'])
        .where('id', '=', userId)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          data: null
        };
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user
      };
    } catch (error) {
      infoLogs(`Error retrieving user by ID: ${error}`, LogTypes.ERROR, 'AuthService');
      return {
        success: false,
        message: 'Internal server error',
        data: null
      };
    }
  }

  async getUserByEmail(email: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const db = await DB.getInstance();
      
      const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'username', 'full_name', 'role', 'is_active', 'created_at'])
        .where('email', '=', email)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          data: null
        };
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user
      };
    } catch (error) {
      infoLogs(`Error retrieving user by email: ${error}`, LogTypes.ERROR, 'AuthService');
      return {
        success: false,
        message: 'Internal server error',
        data: null
      };
    }
  }
}

export const authService = new AuthService();
