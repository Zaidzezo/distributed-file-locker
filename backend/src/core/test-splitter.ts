import * as fs from 'fs';
import * as path from 'path';
import { generateKey } from '../core/encryption.js';
import { splitAndEncrypt, reassembleFragments } from '../core/splitter.js';

async function runSplitterPipelineTest() {
  console.log('🚀 Initiating Full Storage Pipeline Test...\n');

  const mockSourcePath = path.join(process.cwd(), 'mock-large-file.txt');
  const restoredOutputPath = path.join(process.cwd(), 'restored-output-file.txt');

  console.log('📝 Creating a mock source file...');
  const paragraphs = [];
  for (let i = 1; i <= 5000; i++) {
    paragraphs.push(`Line ${i}: Testing data streaming, fragmentation, and cryptographic operations.\n`);
  }
  fs.writeFileSync(mockSourcePath, paragraphs.join(''), 'utf-8');
  const originalSize = fs.statSync(mockSourcePath).size;
  console.log(`📊 Created file size: ${originalSize} bytes`);

  const keyBundle = generateKey();
  const fileId = 'test-file-uuid-12345';

  try {
    console.log('\n🔒 Splitting and encrypting file into fragments...');
    const options = { chunkSize: 50 * 1024 }; // 50 KB Chunks
    const fragments = await splitAndEncrypt(mockSourcePath, fileId, keyBundle.key, options);
    
    console.log(`🧩 Successfully generated ${fragments.length} encrypted fragments.`);
    if (fragments[0]) {
      console.log(`💡 Fragment Sample [Index 0] Size: ${fragments[0].size} bytes`);
      console.log(`📊 Total Expected Fragments: ${fragments[0].totalFragments}`);
    }

    console.log('\n🔀 Shuffling fragments to simulate out-of-order network arrival...');
    const shuffledFragments = [...fragments].reverse();

    console.log('🔓 Reassembling, verifying integrity, and decrypting fragments...');
    await reassembleFragments(shuffledFragments, keyBundle.key, restoredOutputPath);
    console.log('📁 Reassembly stream finished safely.');

    console.log('\n🔬 Performing final file integrity comparison...');
    const originalContent = fs.readFileSync(mockSourcePath, 'utf-8');
    const restoredContent = fs.readFileSync(restoredOutputPath, 'utf-8');

    if (originalContent === restoredContent) {
      console.log('✅ SUCCESS: The restored file matches the original source file 100% perfectly!');
      console.log(`📁 Saved output directly to: ${restoredOutputPath}`);
    } else {
      console.log('❌ FAILURE: Reassembled file contents do not match original text data.');
    }

  } catch (error) {
    console.error('\n❌ CRITICAL PIPELINE ERROR:', error);
  } finally {
    if (fs.existsSync(mockSourcePath)) fs.unlinkSync(mockSourcePath);
    console.log('\n🧹 Temporary testing assets cleaned up.');
  }
}

runSplitterPipelineTest();