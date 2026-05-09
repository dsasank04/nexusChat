import { CACHE_KEYS, CACHE_TTL } from '@common/constants/cache.constants';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RedisService } from 'src/redis/redis.service';

// ─────────────────────────────────────────────────────────────
//  RATE LIMIT CONFIG DECORATOR
//
//  Apply to any route to set custom limits:
//
//  @UseGuards(RateLimitGuard)
//  @RateLimit({ max: 5, windowSecs: 900, type: 'login' })
//  @Post('login')
//  login() { ... }
// ─────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  max: number;
  windowSecs: number;
  type: 'login' | 'register' | 'ai' | 'global';
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (config: RateLimitConfig) => {
  SetMetadata(RATE_LIMIT_KEY, config);
};

// ─────────────────────────────────────────────────────────────
//  DEFAULT LIMITS
//  Used when no @RateLimit decorator is present
// ─────────────────────────────────────────────────────────────

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    max: 5,
    windowSecs: CACHE_TTL.RATE_LOGIN,
    type: 'login',
  },
  register: {
    max: 3,
    windowSecs: CACHE_TTL.RATE_REGISTER,
    type: 'register',
  },
  ai: {
    max: 20,
    windowSecs: CACHE_TTL.RATE_AI,
    type: 'ai',
  },
  global: {
    max: 100,
    windowSecs: 60,
    type: 'global',
  },
};

// ─────────────────────────────────────────────────────────────
//  RATE LIMIT GUARD
//
//  Uses Redis to track request counts per key.
//  Key is built from: type + ip (for auth) or userId (for AI)
//
//  How it works:
//  1. Get config from @RateLimit decorator (or use default)
//  2. Build Redis key based on type + identifier
//  3. Increment counter in Redis
//  4. On first request: set expiry window
//  5. If over limit: throw 429 with retry-after header
// ─────────────────────────────────────────────────────────────

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const response = ctx.switchToHttp().getResponse();

    //Read Config from @RateLimit decorator for this route
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      ctx.getHandler(),
    );

    if (!config) return true; //No rate limit on this route

    // Build Redis key based on type
    const key = this.buildKey(config.type, request);

    // Increment request count in Redis and check if over limit
    try {
      const count = await this.redis.client.incr(key);

      if (1 === count) {
        // First request, set expiry
        await this.redis.client.expire(key, config.windowSecs);
      }
      // get remaining TTL to set Retry-After header
      const ttl = await this.redis.client.ttl(key);

      // Set rate limit headers for client
      response.setHeader('X-RateLimit-Limit', config.max);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(config.max - count, 0),
      );
      response.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

      // If over limit, respond with 429 Too Many Requests
      if (count > config.max) {
        response.setHeader('Retry-After', ttl);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Too many requests. Try again in ${ttl} seconds.`,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    } catch (err) {
      //If it is our own rate limit exception, rethrow it
      if (err instanceof HttpException) throw err;

      // If Redis is down or any other error occurs, log it and allow the request (fail open)
      console.warn('RateLimitGuard: Redis unavailable, skipping rate limit');
      return true;
    }
  }

  // ─────────────────────────────────────────────────────────
  //  BUILD REDIS KEY
  //
  //  Auth routes (login/register) → keyed by IP
  //  Prevents one IP making many accounts/login attempts
  //
  //  AI routes → keyed by userId
  //  Prevents one user hammering the AI endpoint
  // ─────────────────────────────────────────────────────────

  private buildKey(type: string, request: Request): string {
    switch (type) {
      case 'login':
        return CACHE_KEYS.rateLogin(this.getIp(request));
      case 'register':
        return CACHE_KEYS.rateRegister(this.getIp(request));
      case 'ai': {
        const userId = (request as any).user?.id ?? this.getIp(request);
        return CACHE_KEYS.rateAi(userId);
      }
      default:
        return `rate:${type}:${this.getIp(request)}`;
    }
  }

  private getIp(request: Request): string {
    return (
      (request.headers as any)
        .get?.('x-forwarded-for')
        ?.split(',')[0]
        ?.trim() ??
      (request as any).ip ??
      'unknown'
    );
  }
}
