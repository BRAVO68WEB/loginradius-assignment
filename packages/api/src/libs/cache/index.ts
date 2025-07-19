import NodeCache from "node-cache";
import * as redis from "redis";

import infoLogs, { LogTypes } from "@/libs/logger";
import { config } from "@/utils/env";

type CacheEnvironment = "development" | "production";

/**
 * CacheClient class to handle the caching
 */
export class CacheClient {
	private static _clientMode: CacheEnvironment;
	private static _redisClient: redis.RedisClientType;
	private static _nodeClient: NodeCache;

	/**
	 * Get the client based on the environment
	 */
	static get client() {
		return this._clientMode === "production" ? this._redisClient : this._nodeClient;
	}

	/**
	 * Get the environment
	 */
	static get env() {
		return this._clientMode;
	}

	/**
	 * Initialize the caching client
	 * @param forceEnv Force the environment to be set
	 */
	static init(forceEnv?: CacheEnvironment) {
		const env = (forceEnv ?? config.CACHE_ENV ?? config.NODE_ENV) || "development";

		if (!["development", "production"].includes(env))
			throw new Error(
				"Invalid Caching Environment, expected - ['development', 'production'], received - " + env,
			);

		this._clientMode = env as CacheEnvironment;

		const redisUrl = config.REDIS_URL ?? "";

		if (env === "production") {
			this._redisClient = redis.createClient({
				url: redisUrl,
				name: "ec-cache",
			});
			this._redisClient.connect();
		}

		this._nodeClient = new NodeCache();
		infoLogs(`Caching Client initialized in '${env}' environment`, LogTypes.LOGS, "CACHE:INIT");
	}

	/**
	 * Expose single function to handle the client write irrespective of the underlying connections
	 * @param key Key to be set
	 * @param value Value to be set
	 * @param ttl Time to live
	 */
	static async set(key: string, value: string, ttl?: number) {
		if (this._clientMode === "production") {
			await this._redisClient.SETEX(key, ttl ?? 0, value);
		} else {
			this._nodeClient.set(key, value, ttl ?? 0);
		}
	}

	/**
	 * Expose single function to handle the client read irrespective of the underlying connections
	 * @param key Key to be read
	 * @returns Value of the key
	 */
	static async get(key: string): Promise<string | null> {
		return this._clientMode === "production"
			? await this._redisClient.get(key)
			: (this._nodeClient.get(key) as string) || null;
	}

	/**
	 * Increment a key and set TTL if it doesn't exist
	 * @param key Key to increment
	 * @param ttl Time to live in seconds
	 * @returns New value after increment
	 */
	static async incr(key: string, ttl?: number): Promise<number> {
		if (this._clientMode === "production") {
			const newValue = await this._redisClient.INCR(key);
			if (newValue === 1 && ttl) {
				await this._redisClient.EXPIRE(key, ttl);
			}
			return newValue;
		} else {
			const currentValue = parseInt((this._nodeClient.get(key) as string) || "0");
			const newValue = currentValue + 1;
			this._nodeClient.set(key, newValue.toString(), ttl ?? 0);
			return newValue;
		}
	}

	/**
	 * Get all keys matching a pattern
	 * @param pattern Pattern to match keys
	 * @returns Array of matching keys
	 */
	static async keys(pattern: string): Promise<string[]> {
		if (this._clientMode === "production") {
			return await this._redisClient.KEYS(pattern);
		} else {
			// For NodeCache, we need to get all keys and filter them
			const allKeys = this._nodeClient.keys();
			const regex = new RegExp(pattern.replace(/\*/g, '.*'));
			return allKeys.filter(key => regex.test(key));
		}
	}
}