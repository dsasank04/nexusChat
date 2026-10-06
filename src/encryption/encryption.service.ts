// ─────────────────────────────────────────────────────────────
//  ENCRYPTION SERVICE
//
//  Two separate encryption methods for two purposes:
//
//  encryptApiKey / decryptApiKey
//  → AES-256-CBC
//  → Used for storing user API keys (OpenAI, Anthropic etc.)
//  → Key: ENCRYPTION_KEY from .env (64 hex chars = 32 bytes)
//
//  encryptMessage / decryptMessage
//  → AES-256-GCM (authenticated encryption)
//  → Used for storing chat message content
//  → Key: MESSAGE_KEY from .env (64 hex chars = 32 bytes)
//  → GCM includes an auth tag that detects tampering
//
//  WHY TWO SEPARATE KEYS?
//  If one key is ever compromised, the other data stays safe.
//  API keys and messages are separate concerns.
//
//  WHY AES-256-GCM FOR MESSAGES?
//  GCM mode produces an authentication tag.
//  If anyone modifies the encrypted message in the DB,
//  decryption throws an error instead of returning garbage.
//  CBC doesn't have this protection.
// ─────────────────────────────────────────────────────────────

import { Injectable } from "@nestjs/common";
import { ConfigService } from "../config/config.service";
import * as crypto from "crypto";

const ALGORITHM_CBC = 'aes-256-cbc';
const ALGORITHM_GCM = 'aes-256-gcm';
const CBC_IV_LENGTH = 16; // AES block size
const GCM_IV_LENGTH = 12; // 96-bit IV is the recommended size for GCM

@Injectable()
export class EncryptionService {
    private readonly encryptionKey : Buffer;
    private readonly messageKey : Buffer;

    constructor( private readonly config: ConfigService){
        // Keys are 64 hex chars → 32 raw bytes = full 256-bit key
        this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
        this.messageKey = Buffer.from(config.messageKey, 'hex');
    }

    // ─────────────────────────────────────────────────────────
    //  API KEY ENCRYPTION (AES-256-CBC)
    //
    //  Stored format in DB:
    //  "ivHex:encryptedHex"
    //  e.g. "a1b2c3d4...:e5f6g7h8..."
    // ─────────────────────────────────────────────────────────

    encryptApiKey(plainText: string): string {
        const iv = crypto.randomBytes(CBC_IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM_CBC, this.encryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf-8'),
            cipher.final()
        ]);

        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decryptApiKey(stored: string): string {
        const [ivHex, encryptedHex] = stored.split(':');

        if(!ivHex || !encryptedHex) {
            throw new Error('Invalid stored API key format');
        }
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM_CBC, this.encryptionKey, iv);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('utf-8');
    }

    // ─────────────────────────────────────────────────────────
    //  MESSAGE ENCRYPTION (AES-256-GCM)
    //
    //  Stored format in DB:
    //  "ivHex:authTagHex:encryptedHex"
    //  e.g. "a1b2c3...:d4e5f6...:g7h8i9..."
    //
    //  The authTag (16 bytes) is what makes GCM authenticated.
    //  If the encrypted data is modified in any way,
    //  decryption throws "Unsupported state or unable to
    //  authenticate data" instead of returning corrupt text.
    // ─────────────────────────────────────────────────────────

    encryptMessage(plainText: string): string {
        const iv = crypto.randomBytes(GCM_IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM_GCM, this.messageKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf-8'),
            cipher.final()
        ])
        // Auth tag only exists after final() — calling it earlier throws
        const authTag = cipher.getAuthTag();
        return [
            iv.toString('hex'),
            authTag.toString('hex'),
            encrypted.toString('hex')
        ].join(':');
    }

    decryptMessage(stored: string): string {
        const [ivHex, authTagHex, encryptedHex] = stored.split(':');
        if(!ivHex || !authTagHex || !encryptedHex){
            throw new Error('Invalid stored message format');
        }
        const iv = Buffer.from(ivHex,'hex');
        const authTag = Buffer.from(authTagHex,'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM_GCM, this.messageKey, iv);

        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ])
        return decrypted.toString('utf-8');
    }
}
