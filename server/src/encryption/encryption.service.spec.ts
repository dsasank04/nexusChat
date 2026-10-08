import { randomBytes } from 'crypto';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '../config/config.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    const config = {
      encryptionKey: randomBytes(32).toString('hex'),
      messageKey: randomBytes(32).toString('hex'),
    } as ConfigService;
    service = new EncryptionService(config);
  });

  describe('API keys (AES-256-CBC)', () => {
    it('round-trips a key', () => {
      const key = 'sk-proj-abc123';
      const stored = service.encryptApiKey(key);
      expect(stored).not.toContain(key);
      expect(service.decryptApiKey(stored)).toBe(key);
    });

    it('uses a fresh IV each time', () => {
      expect(service.encryptApiKey('same')).not.toBe(service.encryptApiKey('same'));
    });
  });

  describe('messages (AES-256-GCM)', () => {
    it('round-trips unicode content', () => {
      const text = 'Hello 👋 — नमस्ते — multi\nline';
      const stored = service.encryptMessage(text);
      expect(stored.split(':')).toHaveLength(3);
      expect(service.decryptMessage(stored)).toBe(text);
    });

    it('rejects tampered ciphertext', () => {
      const [iv, tag, data] = service.encryptMessage('secret').split(':');
      const flipped = (parseInt(data[0], 16) ^ 1).toString(16) + data.slice(1);
      expect(() => service.decryptMessage([iv, tag, flipped].join(':'))).toThrow();
    });

    it('rejects malformed input', () => {
      expect(() => service.decryptMessage('not-valid')).toThrow('Invalid stored message format');
    });
  });
});
