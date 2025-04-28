const STORAGE_KEY       = 'tradovate-api-access-token'
const EXPIRATION_KEY    = 'tradovate-api-access-expiration'
const DEVICE_ID_KEY     = 'tradovate-device-id'
const AVAIL_ACCTS_KEY   = 'tradovate-api-available-accounts'
const USER_DATA_KEY     = 'tradovate-user-data'

export const setDeviceId = (id: string): void => {
    sessionStorage.setItem(DEVICE_ID_KEY, id)
}

export const getDeviceId = (): string | null => {
    return sessionStorage.getItem(DEVICE_ID_KEY)
}

export const setAvailableAccounts = (accounts: unknown[]): void => {
    sessionStorage.setItem(AVAIL_ACCTS_KEY, JSON.stringify(accounts))
}

/**
 * Returns and array of available accounts or undefined.
 * @returns Account[]
 */
export const getAvailableAccounts = (): unknown[] | null => {
    const accounts = sessionStorage.getItem(AVAIL_ACCTS_KEY)
    return accounts ? JSON.parse(accounts) : null
}

/**
 * Use a predicate function to find an account. May be undefined.
 */
export const queryAvailableAccounts = (predicate: (account: unknown) => boolean): unknown | undefined => {
    const accounts = getAvailableAccounts()
    return accounts ? accounts.find(predicate) : undefined
}

export const setAccessToken = (token: string, expiration: string | number): void => {
    if (!token || !expiration) {
        console.error('Attempted to set invalid token:', { token, expiration })
        return
    }
    
    const expirationDate = new Date(expiration)
    if (isNaN(expirationDate.getTime())) {
        console.error('Invalid expiration date:', expiration)
        return
    }

    console.log('Setting access token:', {
        token: token.substring(0, 10) + '...',
        expiration: expirationDate.toISOString()
    })

    sessionStorage.setItem(STORAGE_KEY, token)
    sessionStorage.setItem(EXPIRATION_KEY, String(expiration))
}

export const getAccessToken = (): { token: string | null; expiration: string | null } => {
    const token = sessionStorage.getItem(STORAGE_KEY)
    const expiration = sessionStorage.getItem(EXPIRATION_KEY)
    
    if (!token || !expiration) {
        console.warn('No access token or expiration found in storage')
        return { token: null, expiration: null }
    }

    const expirationDate = new Date(expiration)
    if (isNaN(expirationDate.getTime())) {
        console.error('Invalid expiration date in storage:', expiration)
        return { token: null, expiration: null }
    }

    console.log('Retrieved access token:', {
        token: token.substring(0, 10) + '...',
        expiration: expirationDate.toISOString(),
        isValid: tokenIsValid(expiration)
    })

    return { token, expiration }
}

export const tokenIsValid = (expiration: string | number): boolean => {
    const expirationDate = new Date(expiration)
    if (isNaN(expirationDate.getTime())) {
        console.error('Invalid expiration date in tokenIsValid:', expiration)
        return false
    }
    
    const isValid = expirationDate.getTime() - new Date().getTime() > 0
    console.log('Token validation:', {
        expiration: expirationDate.toISOString(),
        now: new Date().toISOString(),
        isValid
    })
    
    return isValid
}

export const setUserData = (data: unknown): void => {
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(data))
}

export const getUserData = (): unknown | null => {
    const userData = sessionStorage.getItem(USER_DATA_KEY)
    return userData ? JSON.parse(userData) : null
}