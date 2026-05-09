
// ─────────────────────────────────────────────────────────────
//  REDIS SERVICE
//
//  Manages the ioredis connection to Upstash.
//  Exposes this.client for direct Redis operations.
//
//  Design decision:
//  Redis is NON-FATAL — if it goes down, the app keeps running.
//  Rate limiting and caching degrade gracefully.
//  Auth (JWT blacklist) is the only critical Redis feature —
//  worst case a logged-out token works until it expires (7 days).
// ─────────────────────────────────────────────────────────────

import { ConfigService } from "@config/config.service";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit{
    private redis: Redis;

    constructor(private readOnly config:ConfigService){
        this.redis = new Redis(this.config.redisUrl,{
            // ── Reconnect strategy ──────────────────────────────
            // Exponential backoff: 50ms → 100ms → 200ms → ... → 2000ms
            // Gives up after 10 attempts
            retryStrategy:(times:number) => {
                const MAX_ATTEMPTS = 10;
                const MAX_DELAY = 2000;
                if(times > MAX_ATTEMPTS){
                    console.error(`Redis: Failed to connect after ${MAX_ATTEMPTS} attempts.`);
                    return null; 
                }
                
                const delay = Math.min(50 * Math.pow(2,times), MAX_DELAY);
                console.warn(`Redis: Connection lost. Attempting to reconnect (#${times}) in ${delay}ms...`);
                return delay;
            },

             // ── TLS for Upstash (rediss:// protocol) ─────────────
            tls: this.config.redisUrl.startsWith('rediss://') ? {rejectUnauthorized: false} : undefined,
            
            // Connection Settings
            connectTimeout: 10_000,
            commandTimeout: 5_000,

            // Don't queue commands when disconnected
            // Commands fail immediately instead of piling up
            enableOfflineQueue: false,

            //Auto reconnect for specific errors (e.g. ETIMEDOUT)
            reconnectOnError:(err:Error)=>{
                const reconnectOn = ['ETIMEDOUT','ECONNRESET','EHOSTUNREACH','ENETUNREACH'];
                 return reconnectOn.some(code => err.message.includes(code));
            },

            keyPrefix: 'nexusChat:', // Optional prefix for all keys to avoid collisions
        });

        // ── Event Listeners ─────────────────────────────────────
        this.redis.on('connect', () => console.log('Redis: Connected'));
        this.redis.on('ready', () => {
            if(this.config.isDevelopment) {
                console.log('Redis ready');
            }
        }
        );
        this.redis.on('error', (err) => console.error('Redis Error:', err));
        this.redis.on('close', () => console.warn('⚠️   Redis connection closed'));
        this.redis.on('reconnecting', () => console.warn('⏳  Redis reconnecting...'));
        this.redis.on('end', () => console.warn('⚠️   Redis connection ended'));
    }

    // ---------------------------------------------------------
    // LIFECYCLE HOOKS
    // ---------------------------------------------------------

    async onModuleInit(): Promise<void> {
        await this.testConnection();
    }

    async onModuleDestroy(): Promise<void> {
        await this.closeConnection();
    }

    async testConnection(): Promise<void> {
        try{
            await this.redis.ping();
            console.log('Redis connection successful');
        }
        catch(err){
            console.warn('⚠️   Redis unavailable:', (err as Error).message);
            console.warn('   Rate limiting and caching will be disabled');
        }
    }

    async closeConnection(): Promise<void> {
        try{
            await this.redis.quit();
            console.log('Redis connection closed gracefully');
        }
        catch(err){
            this.redis.disconnect();
        }
    }

    // ─────────────────────────────────────────────────────────
    //  CLIENT GETTER
    //
    //  Exposes the raw ioredis client.
    //  Used by CacheService and RateLimitGuard.
    //
    //  Usage:
    //  await this.redis.client.set('key', 'value')
    //  await this.redis.client.get('key')
    //  await this.redis.client.incr('counter')
    // ─────────────────────────────────────────────────────────

    get client(): Redis {
        return this.redis;
    }

    // ─────────────────────────────────────────────────────────
    //  CONVENIENCE HELPERS
    //  Common operations used frequently across services
    // ─────────────────────────────────────────────────────────
    // Set a key with TTL (seconds)
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, value);
  }
 
  // Get a key — returns null if not found
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }
 
  // Delete a key
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
 
  // Check if a key exists
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }
 
  // Increment a counter (used for rate limiting)
  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }
 
  // Set expiry on existing key (seconds)
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }
 
  // Get remaining TTL of a key in seconds
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }
}