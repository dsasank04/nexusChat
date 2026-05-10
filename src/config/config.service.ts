import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService) {}

  // ── Server ──────────────────────────────────────────────
  get port(): number {
    return this.config.get<number>('PORT') ?? 3001;
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get enableSwagger(): boolean {
    return this.config.get<string>('ENABLE_SWAGGER') === 'true';
  }

  // ── JWT ─────────────────────────────────────────────────
  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return '7d';
  }

  // ── Encryption ──────────────────────────────────────────
  // encryptionKey → encrypts user API keys stored in DB
  get encryptionKey(): string {
    return this.config.getOrThrow<string>('ENCRYPTION_KEY');
  }

  // messageKey → encrypts chat message content stored in DB
  get messageKey(): string {
    return this.config.getOrThrow<string>('MESSAGE_KEY');
  }

  // ── Client ──────────────────────────────────────────────
  get clientUrl(): string {
    return this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173';
  }

  // ── Database ✅ ──────────────────────────────────────────
  // Used by PrismaService to connect
  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get supabaseUrl(): string {
    return this.config.getOrThrow<string>('SUPABASE_URL');
  }

  get supabaseServiceKey(): string {
    return this.config.getOrThrow<string>('SUPABASE_SERVICE_KEY');
  }

  // ── Redis ✅ ─────────────────────────────────────────────
  // Used by RedisService to connect to Upstash
  get redisUrl(): string {
    return this.config.getOrThrow<string>('REDIS_URL');
  }

  // ── Rate limits ─────────────────────────────────────────
  get rateLimits() {
    return {
      login:    { max: 5,  windowSecs: 60 * 15 },  // 5 per 15min per IP
      register: { max: 3,  windowSecs: 60 * 60 },  // 3 per hour per IP
      ai:       { max: 20, windowSecs: 60       },  // 20 per min per user
    };
  }

  // ── Cache TTLs (seconds) ─────────────────────────────────
  get cacheTTL() {
    return {
      conversation:   60 * 30,           // 30 minutes
      userModels:     60 * 60,           // 1 hour
      tokenBlacklist: 60 * 60 * 24 * 7, // 7 days — matches JWT expiry
    };
  }

  // ── Google OAuth ❌ uncomment when AuthModule is added ───
  // get google() {
  //   return {
  //     clientId:     this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
  //     clientSecret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
  //     redirectUri:  this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
  //   };
  // }

  // ── GitHub OAuth ❌ uncomment when AuthModule is added ───
  // get github() {
  //   return {
  //     clientId:     this.config.getOrThrow<string>('GITHUB_CLIENT_ID'),
  //     clientSecret: this.config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
  //     redirectUri:  this.config.getOrThrow<string>('GITHUB_REDIRECT_URI'),
  //   };
  // }
}