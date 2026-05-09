// ─────────────────────────────────────────────────────────────
//  REDIS MODULE
//
//  @Global() makes RedisService injectable everywhere.
//  Used by: CacheService, RateLimitGuard, JwtStrategy
// ─────────────────────────────────────────────────────────────

import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

@Global()
@Module({
    providers:[RedisService],
    exports:[RedisService],
})

export class RedisModule {} 