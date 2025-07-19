import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator as zValidator } from 'hono-openapi/zod';
import { apiReference } from '@scalar/hono-api-reference';
import { z } from 'zod';
import type { Context } from 'hono';
import { AuthController, AdminController } from './auth.controller';
import { authMiddleware, requireAdmin } from './auth.middleware';

const app = new Hono();

// Validation schemas
const LoginSchema = z.object({
  login_indentity: z.string().min(1, 'Login identity is required'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Response schemas
const LoginResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
});

const RegisterResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    created_at: z.string(),
  }),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const UserListResponseSchema = z.object({
  message: z.string(),
  users: z.array(z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    full_name: z.string().nullable(),
    role: z.string(),
    is_active: z.boolean(),
    created_at: z.string(),
  })),
});

// Auth Routes
app.post('/auth/login',
  zValidator('json', LoginSchema),
  describeRoute({
    summary: 'User Login',
    description: 'Authenticate user with brute-force protection',
    tags: ['Authentication'],
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: resolver(LoginResponseSchema),
          },
        },
      },
      401: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      403: {
        description: 'Account suspended or IP blocked',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  AuthController.login
);

app.post('/auth/register',
  zValidator('json', RegisterSchema),
  describeRoute({
    summary: 'User Registration',
    description: 'Register a new user account',
    tags: ['Authentication'],
    responses: {
      201: {
        description: 'Registration successful',
        content: {
          'application/json': {
            schema: resolver(RegisterResponseSchema),
          },
        },
      },
      400: {
        description: 'Registration failed',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  AuthController.register
);

app.post('/auth/logout',
  authMiddleware,
  describeRoute({
    summary: 'User Logout',
    description: 'Logout user session',
    tags: ['Authentication'],
    responses: {
      200: {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: resolver(z.object({ message: z.string() })),
          },
        },
      },
    },
  }),
  AuthController.logout
);

app.get('/auth/me',
  authMiddleware,
  describeRoute({
    summary: 'Get Current User',
    description: 'Retrieve the currently authenticated user',
    tags: ['Authentication'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'User retrieved successfully',
        content: {
          'application/json': {
            schema: resolver(z.object({
              id: z.string(),
              email: z.string(),
              username: z.string(),
              full_name: z.string().nullable(),
              role: z.string(),
              is_active: z.boolean(),
              created_at: z.string(),
            })),
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  AuthController.getCurrentUser
);

// Admin Routes (Protected)
app.get('/admin/users',
  requireAdmin,
  describeRoute({
    summary: 'Get All Users',
    description: 'Retrieve all users from the system (Admin only)',
    tags: ['Admin'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Users retrieved successfully',
        content: {
          'application/json': {
            schema: resolver(UserListResponseSchema),
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      403: {
        description: 'Admin access required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  AdminController.getAllUsers
);

app.get('/admin/anomalies',
  requireAdmin,
  describeRoute({
    summary: 'Get All Anomalies',
    description: 'Retrieve all security anomalies (Admin only)',
    tags: ['Admin'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Anomalies retrieved successfully',
        content: {
          'application/json': {
            schema: resolver(z.object({
              message: z.string(),
              anomalies: z.array(z.object({
                id: z.string(),
                anomaly_type: z.enum(['ip_ratelimited', 'user_login_ratelimited']),
                user_id: z.string().nullable(),
                ip_address: z.string().nullable(),
                created_at: z.string(),
              })),
            })),
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      403: {
        description: 'Admin access required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  AdminController.getAnomalies
);

app.get('/admin/anomaly-stats',
  requireAdmin,
  describeRoute({
    summary: 'Get Anomaly Statistics',
    description: 'Get statistics about security anomalies (Admin only)',
    tags: ['Admin'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Anomaly stats retrieved successfully',
        content: {
          'application/json': {
            schema: resolver(z.object({
              message: z.string(),
              stats: z.object({
                total_recent_attempts: z.number(),
                unique_users_affected: z.number(),
                unique_ips_involved: z.number(),
                blocked_ips: z.number(),
              }),
            })),
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
      403: {
        description: 'Admin access required',
        content: {
          'application/json': {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  AdminController.getAnomalyStats
);

// Health check
app.get('/health', (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
