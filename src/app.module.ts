import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

// ─── Uncomment as you build each week ───────────────────────
// Week 1 Day 3:
// import { DatabaseModule }      from './database/database.module';
// import { RedisModule }         from './redis/redis.module';
// import { EncryptionModule }    from './encryption/encryption.module';
// import { CacheModule }         from './cache/cache.module';
// Week 1 Day 5:
// import { UsersModule }         from './users/users.module';
// import { AuthModule }          from './auth/auth.module';
// Week 2:
// import { ModelsModule }        from './models/models.module';
// Week 3:
// import { ConversationsModule } from './conversations/conversations.module';
// import { MessagesModule }      from './messages/messages.module';
// import { ChatModule }          from './chat/chat.module';
// import { AdaptersModule }      from './adapters/adapters.module';
// Week 4:
// import { SwitchModule }        from './switch/switch.module';
// Week 5:
// import { UsageModule }         from './usage/usage.module';
// import { DashboardModule }     from './dashboard/dashboard.module';
// import { QueueModule }         from './queue/queue.module';

@Module({
  imports: [
    // ── Step 2 complete ──────────────────────────────────────
    ConfigModule,          // validates .env + typed getters
    PrismaModule,         // Prisma ORM + database connection
    RedisModule,
    // ── Uncomment step by step as you build ─────────────────
    // EncryptionModule,
    // CacheModule,
    // UsersModule,
    // AuthModule,
    // ModelsModule,
    // ConversationsModule,
    // MessagesModule,
    // ChatModule,
    // AdaptersModule,
    // SwitchModule,
    // UsageModule,
    // DashboardModule,
    // QueueModule,
  ],
})
export class AppModule {}