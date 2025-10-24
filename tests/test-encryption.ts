/**
 * Test script for secure storage encryption/decryption
 * This validates that the encryption implementation is working correctly
 */

// Mock browser APIs for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  console.log('⚠️  Running in Node.js environment - crypto tests skipped')
  console.log('   Run these tests in a browser environment to validate encryption')
  process.exit(0)
}

import { encryptData, decryptData, isCryptoAvailable } from '../lib/secure-storage'

async function testEncryption() {
  console.log('🔐 Testing Secure Storage Encryption/Decryption\n')

  // Check if crypto is available
  if (!isCryptoAvailable()) {
    console.error('❌ Web Crypto API is not available')
    process.exit(1)
  }
  console.log('✅ Web Crypto API is available\n')

  // Test data
  const testPassword = 'mySecurePassword123!'
  const testUserId = 'user-test-123'

  try {
    // Test 1: Basic encryption and decryption
    console.log('Test 1: Basic Encryption/Decryption')
    console.log('Original password:', testPassword)
    
    const encrypted = await encryptData(testPassword, testUserId)
    console.log('Encrypted data (first 100 chars):', encrypted.substring(0, 100) + '...')
    
    const decrypted = await decryptData(encrypted, testUserId)
    console.log('Decrypted password:', decrypted)
    
    if (decrypted === testPassword) {
      console.log('✅ Test 1 PASSED: Encryption and decryption work correctly\n')
    } else {
      console.error('❌ Test 1 FAILED: Decrypted password does not match original')
      process.exit(1)
    }

    // Test 2: Each encryption produces different ciphertext
    console.log('Test 2: Unique Encryption')
    const encrypted1 = await encryptData(testPassword, testUserId)
    const encrypted2 = await encryptData(testPassword, testUserId)
    
    if (encrypted1 !== encrypted2) {
      console.log('✅ Test 2 PASSED: Each encryption produces unique ciphertext\n')
    } else {
      console.error('❌ Test 2 FAILED: Encryptions should be unique due to random IV')
      process.exit(1)
    }

    // Test 3: Different user IDs produce different encryption
    console.log('Test 3: User-Specific Encryption')
    const userId1 = 'user-1'
    const userId2 = 'user-2'
    
    const encrypted_user1 = await encryptData(testPassword, userId1)
    
    try {
      // Try to decrypt with wrong user ID
      await decryptData(encrypted_user1, userId2)
      console.error('❌ Test 3 FAILED: Should not be able to decrypt with different user ID')
      process.exit(1)
    } catch (error) {
      console.log('✅ Test 3 PASSED: Cannot decrypt with different user ID\n')
    }

    // Test 4: Invalid encrypted data
    console.log('Test 4: Invalid Data Handling')
    try {
      await decryptData('invalid-encrypted-data', testUserId)
      console.error('❌ Test 4 FAILED: Should throw error for invalid data')
      process.exit(1)
    } catch (error) {
      console.log('✅ Test 4 PASSED: Properly handles invalid encrypted data\n')
    }

    // Test 5: Empty password
    console.log('Test 5: Empty Password')
    const emptyPassword = ''
    const encryptedEmpty = await encryptData(emptyPassword, testUserId)
    const decryptedEmpty = await decryptData(encryptedEmpty, testUserId)
    
    if (decryptedEmpty === emptyPassword) {
      console.log('✅ Test 5 PASSED: Can encrypt/decrypt empty password\n')
    } else {
      console.error('❌ Test 5 FAILED: Empty password encryption failed')
      process.exit(1)
    }

    // Test 6: Long password
    console.log('Test 6: Long Password')
    const longPassword = 'A'.repeat(1000)
    const encryptedLong = await encryptData(longPassword, testUserId)
    const decryptedLong = await decryptData(encryptedLong, testUserId)
    
    if (decryptedLong === longPassword) {
      console.log('✅ Test 6 PASSED: Can encrypt/decrypt long password\n')
    } else {
      console.error('❌ Test 6 FAILED: Long password encryption failed')
      process.exit(1)
    }

    // Test 7: Special characters
    console.log('Test 7: Special Characters')
    const specialPassword = '!@#$%^&*()_+-={}[]|:";\'<>?,./~`'
    const encryptedSpecial = await encryptData(specialPassword, testUserId)
    const decryptedSpecial = await decryptData(encryptedSpecial, testUserId)
    
    if (decryptedSpecial === specialPassword) {
      console.log('✅ Test 7 PASSED: Can encrypt/decrypt special characters\n')
    } else {
      console.error('❌ Test 7 FAILED: Special character encryption failed')
      process.exit(1)
    }

    console.log('🎉 All tests passed successfully!')
    console.log('\n📊 Summary:')
    console.log('  - Encryption/Decryption: Working')
    console.log('  - Unique ciphertext: Yes')
    console.log('  - User-specific keys: Yes')
    console.log('  - Error handling: Working')
    console.log('  - Edge cases: Handled')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  }
}

// Run tests
testEncryption().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
