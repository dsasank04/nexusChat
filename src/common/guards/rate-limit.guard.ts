import { CACHE_TTL } from "@common/constants/cache.constants";
import { CanActivate, Injectable, SetMetadata } from "@nestjs/common";

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
    windowSecs:number;
    type: 'login' | 'register' | 'ai' | 'global';
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (config: RateLimitConfig) => {
    SetMetadata(RATE_LIMIT_KEY, config);
}

// ─────────────────────────────────────────────────────────────
//  DEFAULT LIMITS
//  Used when no @RateLimit decorator is present
// ─────────────────────────────────────────────────────────────

const DEFAULT_LIMITS: Record<string,RateLimitConfig> = {
    login:{
        max:5,
        windowSecs: CACHE_TTL.RATE_LOGIN,
        type:'login',
    },
    register:{
        max:3,
        windowSecs: CACHE_TTL.RATE_REGISTER,
        type:'register',
    },
    ai:{
        max:20,
        windowSecs: CACHE_TTL.RATE_AI,
        type:'ai',
    },
    global:{
        max:100,
        windowSecs: 60,
        type:'global',
    }
}

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
        private readonly redis: 
    )
}