import { ClusterManager } from './cluster.js';
import { ingestFile } from './pipeline.js';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

const NODE_URLS = [
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
];

async function run() {
  const testDir = './test-files';
  const testInput = path.join(testDir, 'sample.bin');
  fs.mkdirSync(testDir, { recursive: true });
  const testData = crypto.randomBytes(5 * 1024 * 1024);
  fs.writeFileSync(testInput, testData);
  console.log('🛠  Test file created');

  const result = await ingestFile(testInput, 'mock-tenant-zaid');
  console.log(`✅ Ingested — ${result.fragments.length} fragments`);

  const cluster = new ClusterManager(NODE_URLS);
  console.log('⏳ Waiting for connections...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const locations = await cluster.distributeFragments(result.fragments);
  console.log('📤 Fragments distributed across nodes');

  const retrieved = await cluster.retrieveFragments(locations);
  console.log(`📥 Retrieved ${retrieved.length} fragments`);

  cluster.disconnectAll();
}

run();