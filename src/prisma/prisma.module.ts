import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '../config/config.module';

// ─────────────────────────────────────────────────────────────
//  PRISMA MODULE
//
//  @Global() — PrismaService is available in every module
//  without needing to import PrismaModule each time.
//
//  Import once in app.module.ts — done.
//
//  Usage in any service:
//  constructor(private readonly prisma: PrismaService) {}
// ─────────────────────────────────────────────────────────────
@Global()
@Module({
  imports:   [ConfigModule],
  providers: [PrismaService],
  exports:   [PrismaService],
})
export class PrismaModule {}