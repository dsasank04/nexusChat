import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

// ─────────────────────────────────────────────────────────────
//  USERS MODULE
//
//  No controller — users are reached through AuthModule
//  (GET /api/auth/me). Exported so AuthModule can inject
//  UsersService. PrismaModule is global, so no import needed.
// ─────────────────────────────────────────────────────────────

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
