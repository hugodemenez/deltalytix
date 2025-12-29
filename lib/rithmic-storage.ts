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

const STORAGE_KEY = 'rithmic_sync_data'

export function saveRithmicData(data: RithmicCredentialSet): void {
  try {
    const existingData = getAllRithmicData()
    const updatedData = {
      ...existingData,
      [data.id]: {
        ...data,
        lastSyncTime: data.lastSyncTime || new Date().toISOString()
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
  } catch (error) {
    console.error('Failed to save Rithmic data:', error)
  }
}

export function getRithmicData(id: string): RithmicCredentialSet | null {
  try {
    const allData = getAllRithmicData()
    return allData[id] || null
  } catch (error) {
    console.error('Failed to retrieve Rithmic data:', error)
    return null
  }
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

export function getAllRithmicData(): Record<string, RithmicCredentialSet> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return {}
    
    const parsedData = JSON.parse(data)
    const validatedData: Record<string, RithmicCredentialSet> = {}
    
    // Validate each credential set
    Object.entries(parsedData).forEach(([id, cred]) => {
      if (isValidCredentialSet(cred)) {
        validatedData[id] = cred
      }
    })
    
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
      const allData = getAllRithmicData()
      delete allData[id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.error('Failed to clear Rithmic data:', error)
  }
}

export function updateLastSyncTime(id: string): void {
  try {
    const data = getRithmicData(id)
    if (data) {
      saveRithmicData({
        ...data,
        lastSyncTime: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Failed to update last sync time:', error)
  }
}

// Helper to generate a unique ID for new credential sets
// Uses username as the ID since synchronizations use username as accountId
export function generateCredentialId(username: string): string {
  if (!username) {
    // Fallback for edge cases (should not happen in normal flow)
    return `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  return username
} 
