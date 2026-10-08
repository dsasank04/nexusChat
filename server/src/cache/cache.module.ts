import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

// ─────────────────────────────────────────────────────────────
//  CACHE MODULE
//
//  @Global() — CacheService is injectable everywhere without
//  importing CacheModule again. RedisModule is already global.
//
//  Used by:
//  - AuthService / JwtStrategy → token blacklist, OAuth state
//  - ModelsService             → user models cache
// ─────────────────────────────────────────────────────────────

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
