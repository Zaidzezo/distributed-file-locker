import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { ingestFile, reconstructFile } from './pipeline.js';

async function run() {
  console.log('🛠  Creating test file...');
  const testDir = './test-files';
  const testInput = path.join(testDir, 'sample.bin');

  fs.mkdirSync(testDir, { recursive: true });

  const testData = crypto.randomBytes(5 * 1024 * 1024);
  fs.writeFileSync(testInput, testData);
  
  const result = await ingestFile(testInput, 'test-user-id');
  console.log('✅ Ingest complete —', result.fragments.length, 'fragments created');
  
  const testOutput = path.join(testDir, 'restored-sample.bin');
  await reconstructFile(result, testOutput);
  
  const original = fs.readFileSync(testInput);
  const reconstructed = fs.readFileSync(testOutput);
  
  if (original.equals(reconstructed)) {
    console.log('✅ Reconstructed file matches original');
  } else {
    console.error('❌ Reconstructed file does NOT match original');
  }
}

run();