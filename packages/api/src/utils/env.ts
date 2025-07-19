import { z } from "zod";

export const env = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.string(),
	DB_LOGGING: z.string().default("true"),
	DB_AUTO_MIGRATE: z.string().default("false"),
	DATABASE_SSL: z.string().default("false"),
	// Database configuration
	DATABASE_HOST: z.string(),
	DATABASE_PORT: z.string(),
	DATABASE_USER: z.string(),
	DATABASE_PASSWORD: z.string(),
	DATABASE_NAME: z.string(),
	// JWT configuration
	JWT_SECRET: z.string(),
	// Redis configuration
	CACHE_ENV: z.enum(["development", "production"]).default("development"),
	REDIS_URL: z.string().optional(),
});

export type Env = z.infer<typeof env>;

/**
 * Get parsed the environment variables
 */
export const config = env.parse(process.env);