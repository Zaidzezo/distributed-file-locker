import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Fragment } from '../types/index.js';
import { checksumBuffer } from '../utils/checksum.js';
import { encryptChunk, serializeChunk, deserializeChunk, decryptChunk } from './encryption.js';

interface SplitOptions {
  chunkSize?: number;
}

export async function splitAndEncrypt(
  filePath: string,
  fileId: string,
  encKey: Buffer,
  options: SplitOptions = {}
): Promise<Fragment[]> {
  const chunkSize = options.chunkSize || 64 * 1024; 
  const fragments: Fragment[] = [];
  
  const fileStats = fs.statSync(filePath);
  const totalFragments = Math.ceil(fileStats.size / chunkSize);

  const readStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
  let index = 0;

  for await (const rawChunk of readStream) {
    const bufferChunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);

    const encrypted = encryptChunk(bufferChunk, encKey);
    const packedBuffer = serializeChunk(encrypted);
    const hash = checksumBuffer(packedBuffer);

    fragments.push({
      id: uuidv4(),
      fileId,
      index,
      totalFragments,              
      data: packedBuffer,          
      checksum: hash,
      size: packedBuffer.length,   
    });

    index++;
  }

  return fragments;
}


export async function reassembleFragments(
  fragments: Fragment[],
  encKey: Buffer,
  outputPath: string
): Promise<void> {
  const sortedFragments = [...fragments].sort((a, b) => a.index - b.index);

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(outputPath);

  try {
    for (const fragment of sortedFragments) {
      const currentHash = checksumBuffer(fragment.data);
      if (currentHash !== fragment.checksum) {
        throw new Error(`CRITICAL: Fragment integrity validation failed at index ${fragment.index}. Data has been tampered with or corrupted!`);
      }

      const unpacked = deserializeChunk(fragment.data);
      const decryptedChunk = decryptChunk(unpacked, encKey);

      const canContinue = writeStream.write(decryptedChunk);
      
      if (!canContinue) {
        await new Promise<void>((resolve) => writeStream.once('drain', resolve));
      }
    }
  } finally {
    writeStream.end();
  }

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}