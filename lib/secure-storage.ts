/**
 * Secure storage utility for encrypting and decrypting sensitive data in localStorage
 * Uses Web Crypto API (AES-GCM) for encryption
 * 
 * Security measures:
 * - AES-256-GCM encryption
 * - Unique initialization vector (IV) for each encryption
 * - Key derived from user-specific data using PBKDF2
 * - Data is base64 encoded for storage
 */

interface EncryptedData {
  ciphertext: string
  iv: string
  salt: string
}

/**
 * Generate a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    } as Pbkdf2Params,
    keyMaterial,
    { name: 'AES-GCM', length: 256 } as AesKeyGenParams,
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Get a user-specific encryption key
 * Uses a combination of userId and browser fingerprint
 */
async function getUserKey(userId: string): Promise<string> {
  // Combine userId with browser-specific data for key derivation
  const browserData = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.colorDepth.toString(),
    screen.width.toString(),
    screen.height.toString()
  ].join('|')
  
  return `${userId}:${browserData}`
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: string, userId: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Derive key from user-specific password
    const userKey = await getUserKey(userId)
    const key = await deriveKey(userKey, salt)
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    )
    
    // Convert to base64 for storage
    const encryptedData: EncryptedData = {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt))
    }
    
    return JSON.stringify(encryptedData)
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedString: string, userId: string): Promise<string> {
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedString)
    
    // Convert from base64
    const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0))
    const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0))
    
    // Derive key from user-specific password
    const userKey = await getUserKey(userId)
    const key = await deriveKey(userKey, salt)
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues !== 'undefined'
}
