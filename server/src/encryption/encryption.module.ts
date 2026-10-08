import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { ConfigModule }  from '../config/config.module';

// ─────────────────────────────────────────────────────────────
//  ENCRYPTION MODULE
//
//  @Global() — EncryptionService available everywhere
//  without importing EncryptionModule in each module.
//
//  Used by:
//  - ModelsService    → encrypt/decrypt user API keys
//  - MessagesService  → encrypt/decrypt chat content
// ─────────────────────────────────────────────────────────────

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EncryptionService],
    exports: [EncryptionService],
})
export class EncryptionModule {}