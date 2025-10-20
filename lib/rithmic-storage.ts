import { encryptData, decryptData, isCryptoAvailable } from './secure-storage'

export interface RithmicCredentialSet {
  id: string // unique identifier for this credential set
  credentials: {
    username: string
    password: string
    server_type: string
    location: string
  }
  selectedAccounts: string[]
  lastSyncTime: string
  name?: string // optional display name for the credential set
  allAccounts?: boolean // flag to indicate if all accounts should be synced
}

// Internal storage format with encrypted credentials
interface StoredRithmicCredentialSet {
  id: string
  credentials: {
    username: string
    encryptedPassword: string // password is encrypted
    server_type: string
    location: string
  }
  selectedAccounts: string[]
  lastSyncTime: string
  name?: string
  allAccounts?: boolean
}

const STORAGE_KEY = 'rithmic_sync_data'
const STORAGE_VERSION_KEY = 'rithmic_storage_version'
const CURRENT_VERSION = '2.0' // Version 2.0 uses encryption

/**
 * Save Rithmic credentials with encrypted password
 * @param data - The credential set to save
 * @param userId - The user ID for encryption key derivation
 */
export async function saveRithmicData(data: RithmicCredentialSet, userId: string): Promise<void> {
  try {
    if (!isCryptoAvailable()) {
      console.warn('Web Crypto API not available, storing without encryption')
      // Fallback to unencrypted storage in unsupported environments
      const existingData = getAllRithmicDataSync()
      const updatedData = {
        ...existingData,
        [data.id]: {
          ...data,
          lastSyncTime: data.lastSyncTime || new Date().toISOString()
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
      return
    }

    const existingData = await getAllRithmicData(userId)
    
    // Encrypt the password
    const encryptedPassword = await encryptData(data.credentials.password, userId)
    
    const storedData: StoredRithmicCredentialSet = {
      ...data,
      credentials: {
        username: data.credentials.username,
        encryptedPassword,
        server_type: data.credentials.server_type,
        location: data.credentials.location
      },
      lastSyncTime: data.lastSyncTime || new Date().toISOString()
    }
    
    const updatedData = {
      ...existingData,
      [data.id]: storedData
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION)
  } catch (error) {
    console.error('Failed to save Rithmic data:', error)
    throw error
  }
}

/**
 * Get a single credential set by ID with decrypted password
 * @param id - The credential set ID
 * @param userId - The user ID for decryption key derivation
 */
export async function getRithmicData(id: string, userId: string): Promise<RithmicCredentialSet | null> {
  try {
    const allData = await getAllRithmicData(userId)
    return allData[id] || null
  } catch (error) {
    console.error('Failed to retrieve Rithmic data:', error)
    return null
  }
}

/**
 * Synchronous version for backward compatibility (returns data without decrypted passwords)
 */
function getAllRithmicDataSync(): Record<string, any> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return {}
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to retrieve Rithmic data:', error)
    localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

function isValidStoredCredentialSet(data: any): data is StoredRithmicCredentialSet {
  return (
    data &&
    typeof data.id === 'string' &&
    data.credentials &&
    typeof data.credentials.username === 'string' &&
    typeof data.credentials.encryptedPassword === 'string' &&
    typeof data.credentials.server_type === 'string' &&
    typeof data.credentials.location === 'string' &&
    Array.isArray(data.selectedAccounts) &&
    typeof data.lastSyncTime === 'string'
  )
}

export function isValidCredentialSet(data: any): data is RithmicCredentialSet {
  return (
    data &&
    typeof data.id === 'string' &&
    data.credentials &&
    typeof data.credentials.username === 'string' &&
    typeof data.credentials.password === 'string' &&
    typeof data.credentials.server_type === 'string' &&
    typeof data.credentials.location === 'string' &&
    Array.isArray(data.selectedAccounts) &&
    typeof data.lastSyncTime === 'string'
  )
}

/**
 * Get all credential sets with decrypted passwords
 * @param userId - The user ID for decryption key derivation
 */
export async function getAllRithmicData(userId: string): Promise<Record<string, RithmicCredentialSet>> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return {}
    
    const parsedData = JSON.parse(data)
    const validatedData: Record<string, RithmicCredentialSet> = {}
    
    // Check if we need to migrate from old unencrypted format
    const version = localStorage.getItem(STORAGE_VERSION_KEY)
    const needsMigration = !version || version !== CURRENT_VERSION
    
    if (!isCryptoAvailable()) {
      // Return data as-is if crypto is not available
      Object.entries(parsedData).forEach(([id, cred]) => {
        if (isValidCredentialSet(cred)) {
          validatedData[id] = cred as RithmicCredentialSet
        }
      })
      return validatedData
    }
    
    // Decrypt passwords for each credential set
    for (const [id, cred] of Object.entries(parsedData)) {
      try {
        const storedCred = cred as any
        
        // Handle migration from old format
        if (needsMigration && storedCred.credentials?.password && !storedCred.credentials?.encryptedPassword) {
          // Old format with plain password - encrypt it
          const encryptedPassword = await encryptData(storedCred.credentials.password, userId)
          validatedData[id] = {
            ...storedCred,
            credentials: {
              ...storedCred.credentials,
              password: storedCred.credentials.password
            }
          } as RithmicCredentialSet
          
          // Save back with encryption
          await saveRithmicData(validatedData[id], userId)
        } else if (isValidStoredCredentialSet(storedCred)) {
          // New format with encrypted password
          const decryptedPassword = await decryptData(storedCred.credentials.encryptedPassword, userId)
          validatedData[id] = {
            ...storedCred,
            credentials: {
              ...storedCred.credentials,
              password: decryptedPassword
            }
          } as RithmicCredentialSet
        }
      } catch (error) {
        console.error(`Failed to decrypt credential set ${id}:`, error)
        // Skip this credential set if decryption fails
      }
    }
    
    return validatedData
  } catch (error) {
    console.error('Failed to retrieve all Rithmic data:', error)
    // If there's an error, clear the corrupted data
    localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

export function clearRithmicData(id?: string): void {
  try {
    if (id) {
      const allData = getAllRithmicDataSync()
      delete allData[id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
    } else {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_VERSION_KEY)
    }
  } catch (error) {
    console.error('Failed to clear Rithmic data:', error)
  }
}

export async function updateLastSyncTime(id: string, userId: string): Promise<void> {
  try {
    const data = await getRithmicData(id, userId)
    if (data) {
      await saveRithmicData({
        ...data,
        lastSyncTime: new Date().toISOString()
      }, userId)
    }
  } catch (error) {
    console.error('Failed to update last sync time:', error)
  }
}

// Helper to generate a unique ID for new credential sets
export function generateCredentialId(): string {
  return `rithmic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
} 
