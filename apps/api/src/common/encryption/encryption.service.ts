import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * App-layer PHI encryption (AES-256-GCM) for sensitive identity fields
 * (e.g. Emirates ID, passport number). The DB stores ciphertext only.
 *
 * Key: process.env.CLINIC_PHI_KEY — a 32-byte key, base64 or hex encoded.
 * Fails closed: encrypt/decrypt throw if the key is missing/invalid, so PHI is
 * never written or read in plaintext by accident.
 *
 * Stored format: "v1:" + base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private static readonly PREFIX = 'v1';

  private getKey(): Buffer {
    const raw = process.env.CLINIC_PHI_KEY;
    if (!raw) {
      throw new InternalServerErrorException(
        'CLINIC_PHI_KEY is not configured — cannot process protected identity data.',
      );
    }
    let key: Buffer;
    try {
      key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    } catch {
      throw new InternalServerErrorException('CLINIC_PHI_KEY is not valid base64/hex.');
    }
    if (key.length !== 32) {
      throw new InternalServerErrorException('CLINIC_PHI_KEY must decode to 32 bytes (256-bit).');
    }
    return key;
  }

  /** Returns true if the value looks like an already-encrypted payload. */
  isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(`${EncryptionService.PREFIX}:`);
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (plaintext === null || plaintext === undefined || plaintext === '') return null;
    if (this.isEncrypted(plaintext)) return plaintext; // already encrypted
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [
      EncryptionService.PREFIX,
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(stored: string | null | undefined): string | null {
    if (stored === null || stored === undefined || stored === '') return null;
    if (!this.isEncrypted(stored)) return stored; // legacy/plaintext — return as-is
    const key = this.getKey();
    const [, ivB64, tagB64, dataB64] = stored.split(':');
    try {
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (e) {
      this.logger.error('Failed to decrypt protected identity field.');
      throw new InternalServerErrorException('Unable to read protected identity data.');
    }
  }

  /** Last 4 visible, rest masked — for safe display/logging of an ID number. */
  mask(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;
    const s = plaintext.replace(/\s+/g, '');
    return s.length <= 4 ? '••••' : `••••${s.slice(-4)}`;
  }
}
