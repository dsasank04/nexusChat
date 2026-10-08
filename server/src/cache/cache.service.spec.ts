import { CacheService } from './cache.service';
import { RedisService } from '../redis/redis.service';

// Minimal in-memory stand-in for RedisService (TTL is recorded, not enforced)
function fakeRedis() {
  const store = new Map<string, { value: string; ttl: number }>();
  let down = false;
  const guard = () => {
    if (down) throw new Error('Connection is closed.');
  };
  const redis = {
    store,
    setDown: (value: boolean) => (down = value),
    set: async (key: string, value: string, ttl: number) => {
      guard();
      store.set(key, { value, ttl });
    },
    get: async (key: string) => {
      guard();
      return store.get(key)?.value ?? null;
    },
    del: async (key: string) => {
      guard();
      store.delete(key);
    },
    exists: async (key: string) => {
      guard();
      return store.has(key);
    },
    client: {
      getdel: async (key: string) => {
        guard();
        const value = store.get(key)?.value ?? null;
        store.delete(key);
        return value;
      },
    },
  };
  return redis;
}

describe('CacheService', () => {
  let redis: ReturnType<typeof fakeRedis>;
  let cache: CacheService;

  beforeEach(() => {
    redis = fakeRedis();
    cache = new CacheService(redis as unknown as RedisService);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('user models', () => {
    it('never writes API keys to Redis', async () => {
      await cache.setUserModels('u1', [
        { provider: 'openai', modelName: 'gpt-4o', encryptedKey: 'iv:secret' },
      ]);
      const stored = redis.store.get('models:u1')!.value;
      expect(stored).not.toContain('secret');
      expect(stored).not.toContain('encryptedKey');
      expect(await cache.getUserModels('u1')).toEqual([{ provider: 'openai', modelName: 'gpt-4o' }]);
    });

    it('does not modify the caller’s objects', async () => {
      const model = { provider: 'openai', encryptedKey: 'iv:secret' };
      await cache.setUserModels('u1', [model]);
      expect(model.encryptedKey).toBe('iv:secret');
    });

    it('returns null on a miss and after invalidation', async () => {
      expect(await cache.getUserModels('u1')).toBeNull();
      await cache.setUserModels('u1', [{ provider: 'gemini' }]);
      await cache.invalidateUserModels('u1');
      expect(await cache.getUserModels('u1')).toBeNull();
    });

    it('drops a corrupt entry instead of throwing', async () => {
      redis.store.set('models:u1', { value: '{not json', ttl: 60 });
      expect(await cache.getUserModels('u1')).toBeNull();
      expect(redis.store.has('models:u1')).toBe(false);
    });
  });

  describe('token blacklist', () => {
    it('blacklists by jti with the remaining lifetime as TTL', async () => {
      await cache.blacklistToken('jti-1', 899.4);
      expect(redis.store.get('blacklist:jti-1')!.ttl).toBe(900);
      expect(await cache.isTokenBlacklisted('jti-1')).toBe(true);
      expect(await cache.isTokenBlacklisted('jti-2')).toBe(false);
    });

    it('skips tokens that have already expired', async () => {
      await cache.blacklistToken('jti-1', 0);
      expect(redis.store.size).toBe(0);
    });
  });

  describe('OAuth state', () => {
    it('accepts a state exactly once', async () => {
      await cache.setOAuthState('abc');
      expect(await cache.consumeOAuthState('abc')).toBe(true);
      expect(await cache.consumeOAuthState('abc')).toBe(false);
    });

    it('rejects an unknown state', async () => {
      expect(await cache.consumeOAuthState('never-issued')).toBe(false);
    });
  });

  describe('when Redis is down', () => {
    beforeEach(() => redis.setDown(true));

    it('treats reads as cache misses and writes as no-ops', async () => {
      await expect(cache.setUserModels('u1', [{ provider: 'openai' }])).resolves.toBeUndefined();
      expect(await cache.getUserModels('u1')).toBeNull();
    });

    it('fails open for the blacklist check', async () => {
      expect(await cache.isTokenBlacklisted('jti-1')).toBe(false);
    });

    it('fails closed for OAuth state', async () => {
      expect(await cache.consumeOAuthState('abc')).toBe(false);
    });
  });
});
