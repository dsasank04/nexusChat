import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '../config/config.service';

// ─────────────────────────────────────────────────────────────
//  PRISMA SERVICE
//
//  Extends PrismaClient so you can inject it directly
//  and use this.prisma.user.findUnique() etc.
//
//  Replaces the old DatabaseService (raw pg pool).
//  All tables defined in schema.prisma are available
//  as typed properties on this service.
// ─────────────────────────────────────────────────────────────
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({
      adapter,
      // Log slow queries and errors in development
      log: config.isDevelopment
        ? [
            { emit: 'event', level: 'query'  },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn'  },
          ]
        : [
            { emit: 'stdout', level: 'error' },
          ],
    });

    // Log slow queries in development (over 500ms)
    if (config.isDevelopment) {
      // @ts-expect-error — Prisma event typing
      this.$on('query', (e: { duration: number; query: string }) => {
        if (e.duration > 500) {
          console.warn(`🐢  Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  //  LIFECYCLE HOOKS
  //  NestJS calls these automatically on start/stop
  // ─────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('✅  Database connected via Prisma');
    } catch (err) {
      console.error('❌  Database connection failed:', (err as Error).message);
      console.error('   Check DATABASE_URL in your .env file');
      process.exit(1);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    console.log('✅  Database disconnected gracefully');
  }

  // ─────────────────────────────────────────────────────────
  //  CLEAN DATABASE (used in e2e tests only)
  //  Deletes all rows from all tables in correct order
  //  to respect foreign key constraints
  // ─────────────────────────────────────────────────────────
  async cleanDatabase(): Promise<void> {
    if (this.config.isProduction) {
      throw new Error('cleanDatabase cannot be called in production');
    }

    await this.$transaction([
      this.usageTracking.deleteMany(),
      this.modelSwitchLog.deleteMany(),
      this.message.deleteMany(),
      this.userCredential.deleteMany(),
      this.userModel.deleteMany(),
      this.conversation.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}