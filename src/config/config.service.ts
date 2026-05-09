import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

// ─────────────────────────────────────────────────────────────
//  CONFIG SERVICE
//
//  Wraps NestJS ConfigService with typed getters.
//  Instead of doing this everywhere:
//    this.configService.get<string>('JWT_SECRET')
//
//  You do this:
//    this.configService.jwtSecret
//
//  Benefits:
//  - TypeScript knows the exact return type
//  - One place to change if an env var name changes
//  - IDE autocomplete works perfectly
//  - No risk of typos in variable names
// ─────────────────────────────────────────────────────────────

@Injectable()
export class ConfigService {
    constructor(private readonly config: NestConfigService) {}

    //SERVER
    get port(): number {
        return this.config.get<number>('PORT') ?? 3001;
    }
    get nodeEnv() : string {
        return this.config.get<string>('NODE_ENV') ?? 'development';
    }
    get isProduction(): boolean{
        return this.nodeEnv === 'production';
    }

    get isDevelopment(): boolean {
      return this.nodeEnv === 'development';
    }

    get isTest(): boolean{
        return this.nodeEnv ==='test';
    }

    get enableSwagger(): boolean{
        return this.config.get<string>('ENABLE_SWAGGER') === 'true';
    }

    //JWT
    get jwtSecret(): string{
        return this.config.getOrThrow<string>('JWT_SECRET');
    }
    //token expire- 7days 
    get jwtExpiresIn(): string{
        return '7d';
    }

     get encryptionKey(): string {
    return this.config.getOrThrow<string>('ENCRYPTION_KEY');
  }
 
  get messageKey(): string {
    return this.config.getOrThrow<string>('MESSAGE_KEY');
  }

  get clientUrl(): string {
    return this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173';
  }

   // ── Database ✅ now active ───────────────────────────────
  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }
 
  get supabaseUrl(): string {
    return this.config.getOrThrow<string>('SUPABASE_URL');
  }
 
  get supabaseServiceKey(): string {
    return this.config.getOrThrow<string>('SUPABASE_SERVICE_KEY');
  }
 
  // ── Redis ✅ now active ──────────────────────────────────
  get redisUrl(): string {
    return this.config.getOrThrow<string>('REDIS_URL');
  }

  get rateLimits() {
    return {
      // Login: 5 attempts per 15 minutes per IP
      login: {
        max:        5,
        windowSecs: 60 * 15,
      },
      // Register: 3 accounts per hour per IP
      register: {
        max:        3,
        windowSecs: 60 * 60,
      },
      // AI stream: 20 requests per minute per user
      ai: {
        max:        20,
        windowSecs: 60,
      },
    };
  }

  get cacheTTL() {
    return {
      conversation:   60 * 30,            // 30 minutes
      userModels:     60 * 60,            // 1 hour
      tokenBlacklist: 60 * 60 * 24 * 7,  // 7 days — matches JWT expiry
    };
  }

}