// ─────────────────────────────────────────────────────────────
//  REDIS MODULE
//
//  @Global() makes RedisService injectable everywhere.
//  Used by: CacheService, RateLimitGuard, JwtStrategy
// ─────────────────────────────────────────────────────────────

import { Global, Module } from "@nestjs/common";

@Global()
@Module({
    
})