import { generateKey, encryptChunk, serializeChunk, deserializeChunk, decryptChunk, keyToHex, hexToKey } from '../core/encryption.js';

async function runEncryptionTest() {
  console.log('🚀 Starting Encryption Engine Test...\n');

  const masterKeyBundle = generateKey();
  console.log('🔑 Generated Key (Hex):', keyToHex(masterKeyBundle.key));
  console.log('📦 Generated IV (Hex): ', keyToHex(masterKeyBundle.iv));
  console.log('--------------------------------------------------');

  const originalSecret = 'This is a top-secret chunk of a user file!';
  const dataBuffer = Buffer.from(originalSecret, 'utf-8');
  console.log('📝 Original Text:', originalSecret);

  const encrypted = encryptChunk(dataBuffer, masterKeyBundle.key);
  console.log('🔒 Encrypted Ciphertext (Hex):', encrypted.ciphertext.toString('hex').slice(0, 40) + '...');

  const packedDiskBuffer = serializeChunk(encrypted);
  console.log(`📦 Packed Buffer Length: ${packedDiskBuffer.length} bytes (12B IV + 16B Tag + ${encrypted.ciphertext.length}B Ciphertext)`);

  const unpacked = deserializeChunk(packedDiskBuffer);
  console.log('🔓 Unpacked metadata successfully from binary sequence.');

  try {
    const decryptedBuffer = decryptChunk(unpacked, masterKeyBundle.key);
    const decryptedText = decryptedBuffer.toString('utf-8');
    
    console.log('--------------------------------------------------');
    if (decryptedText === originalSecret) {
      console.log('✅ SUCCESS: Decrypted text matches the original perfectly!');
      console.log('🔓 Decrypted Output:', decryptedText);
    } else {
      console.log('❌ FAILURE: Decrypted text does not match.');
    }
  } catch (error) {
    console.error('❌ CRITICAL: Decryption or integrity verification failed!', error);
  }
}

runEncryptionTest();