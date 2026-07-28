import * as crypto from 'crypto';
import type { EncryptionKey, EncryptedChunk } from '../types/index.js';

export function generateKey(): EncryptionKey {
  return {
    key: crypto.randomBytes(32),
    iv: crypto.randomBytes(12), 
  };
}

export function encryptChunk(data: Buffer, key: Buffer): EncryptedChunk {
  const iv = crypto.randomBytes(12);
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();

  return { iv, authTag, ciphertext };
}

export function decryptChunk(chunk: EncryptedChunk, key: Buffer): Buffer {
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, chunk.iv);
        decipher.setAuthTag(chunk.authTag);

        return Buffer.concat([
            decipher.update(chunk.ciphertext),
            decipher.final()
        ]);
    } catch (error) {
        throw new Error('Decryption failed: Data may be corrupted or key is incorrect.');
    }
}


export function serializeChunk(chunk: EncryptedChunk): Buffer {
  return Buffer.concat([
    chunk.iv,       
    chunk.authTag,  
    chunk.ciphertext
  ]);
}


export function deserializeChunk(data: Buffer): EncryptedChunk {
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28); 
  const ciphertext = data.subarray(28);

  return { iv, authTag, ciphertext };
}


export function keyToHex(key: Buffer): string {
  return key.toString('hex');
}


export function hexToKey(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}