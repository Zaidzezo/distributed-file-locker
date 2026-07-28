import { checksumBuffer, checksumFile } from './checksum.js'
import * as fs from 'fs';
import * as path from 'path';

const sampleBuffer = Buffer.from('hello world');
const bufferHash = checksumBuffer(sampleBuffer);
console.log('✅ Buffer Hash:', bufferHash);

const tempFilePath = path.join(process.cwd(), 'dummy.txt');
fs.writeFileSync(tempFilePath, 'This is a secret file chunk!');

async function runFileTest() {
  try {
    const fileHash = await checksumFile(tempFilePath);
    console.log('✅ File Hash:', fileHash);
    
    fs.unlinkSync(tempFilePath);
  } catch (error) {
    console.error('❌ File hashing failed:', error);
  }
}

runFileTest();