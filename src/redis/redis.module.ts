// ─────────────────────────────────────────────────────────────
//  REDIS MODULE
//
//  @Global() makes RedisService injectable everywhere.
//  Used by: CacheService, RateLimitGuard, JwtStrategy
// ─────────────────────────────────────────────────────────────

import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { ConfigModule } from "../config/config.module";

@Global()
@Module({
    imports:[ConfigModule],
    providers:[RedisService],
    exports:[RedisService],
})

export class RedisModule {} 