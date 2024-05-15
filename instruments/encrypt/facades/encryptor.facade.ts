import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptorFacade {
  private secretKey: Buffer;

  constructor(secretKey: string) {
    if (secretKey.length !== 64) {
      throw new Error('Secret key must be 64 bytes long for AES-256.');
    }

    this.secretKey = Buffer.from(secretKey, 'hex');
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf-8', 'base64');
    encrypted += cipher.final('base64');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(data: string): string {
    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.secretKey, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }
}
