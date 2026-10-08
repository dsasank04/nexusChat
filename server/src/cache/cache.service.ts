// ─────────────────────────────────────────────────────────────
//  CACHE SERVICE
//
//  Every Redis read/write the app does goes through here.
//
//  1. User models    → list of a user's connected models (1 hour)
//                      API keys are stripped BEFORE caching —
//                      a key never reaches Redis, even encrypted.
//  2. Token blacklist → logged-out JWTs, keyed by their jti,
//                      expiring when the token itself would.
//  3. OAuth state     → one-time CSRF state for Google/GitHub,
//                      read-and-deleted atomically (GETDEL).
//
//  Message history is deliberately NOT cached: decrypted chats
//  should never sit in Redis, and the indexed DB query is fast.
//
//  If Redis is down:
//  - cache reads return null (callers fall back to the DB)
//  - the blacklist check returns false (fail open — access
//    tokens are short-lived, so a blip can't lock users out)
//  - OAuth state checks return false (fail closed — a sign-in
//    can simply be retried)
// ─────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { CACHE_KEYS, CACHE_TTL } from '../common/constants/cache.constants';
import { RedisService } from '../redis/redis.service';

// Field names that must never be written to Redis
const SECRET_FIELDS = ['encryptedKey', 'encrypted_key', 'apiKey'] as const;

@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  // ─────────────────────────────────────────────────────────
  //  USER MODELS
  // ─────────────────────────────────────────────────────────

  async setUserModels<T extends object>(userId: string, models: T[]): Promise<void> {
    const safe = models.map((model) => stripSecrets(model));
    await this.safely('setUserModels', () =>
      this.redis.set(CACHE_KEYS.userModels(userId), JSON.stringify(safe), CACHE_TTL.USER_MODELS),
    );
  }

  async getUserModels<T>(userId: string): Promise<T[] | null> {
    const raw = await this.safely('getUserModels', () =>
      this.redis.get(CACHE_KEYS.userModels(userId)),
    );
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T[];
    } catch {
      // Corrupt entry — drop it so the next read rebuilds from the DB
      await this.invalidateUserModels(userId);
      return null;
    }
  }

  async invalidateUserModels(userId: string): Promise<void> {
    await this.safely('invalidateUserModels', () =>
      this.redis.del(CACHE_KEYS.userModels(userId)),
    );
  }

  // ─────────────────────────────────────────────────────────
  //  TOKEN BLACKLIST
  //
  //  Keyed by the JWT's jti (a random id per token), not the
  //  whole token — shorter keys, and no bearer tokens in Redis.
  // ─────────────────────────────────────────────────────────

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    // Already-expired tokens don't need blacklisting
    if (ttlSeconds <= 0) return;
    const ttl = Math.min(Math.ceil(ttlSeconds), CACHE_TTL.TOKEN_BLACKLIST);
    await this.safely('blacklistToken', () =>
      this.redis.set(CACHE_KEYS.blacklist(jti), '1', ttl),
    );
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.safely('isTokenBlacklisted', () =>
      this.redis.exists(CACHE_KEYS.blacklist(jti)),
    );
    return result ?? false; // fail open
  }

  // ─────────────────────────────────────────────────────────
  //  OAUTH STATE (CSRF protection)
  // ─────────────────────────────────────────────────────────

  async setOAuthState(state: string): Promise<void> {
    await this.safely('setOAuthState', () =>
      this.redis.set(CACHE_KEYS.oauthState(state), '1', CACHE_TTL.OAUTH_STATE),
    );
  }

  // Returns true only the FIRST time a valid state is presented
  async consumeOAuthState(state: string): Promise<boolean> {
    const value = await this.safely('consumeOAuthState', () =>
      this.redis.client.getdel(CACHE_KEYS.oauthState(state)),
    );
    return value === '1'; // fail closed
  }

  // ─────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────

  // Runs a Redis call; on failure logs a warning and returns null
  private async safely<T>(operation: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      console.warn(`CacheService.${operation}: Redis unavailable — ${(err as Error).message}`);
      return null;
    }
  }
}

function stripSecrets<T extends object>(model: T): T {
  const copy = { ...model } as Record<string, unknown>;
  for (const field of SECRET_FIELDS) delete copy[field];
  return copy as T;
}
