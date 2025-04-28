// Define interfaces for the data structures
interface AuthData {
  'p-ticket'?: string;
  [key: string]: any;
}

interface AuthResponse {
  'p-ticket'?: string;
  'p-time'?: number;
  'p-captcha'?: boolean;
  accessToken?: string;
  userId?: number;
  userStatus?: string;
  name?: string;
  expirationTime?: string | number;
  errorText?: string;
}

interface UserData {
  userId: number;
  name: string;
}

interface TokenInfo {
  token: string | null;
  expiration: string | null;
}

import { setAccessToken, getAccessToken, tokenIsValid, setAvailableAccounts, setUserData, getUserData } from './storage'
import { tvGet, tvPost } from './services'
import { waitForMs } from './utils/wait-for-ms'


const handleRetry = async (data: AuthData, json: AuthResponse): Promise<AuthResponse | undefined> => {
    const ticket    = json['p-ticket'],
          time      = json['p-time'],
          captcha   = json['p-captcha']

    if(captcha) {
        console.error('Captcha present, cannot retry auth request via third party application. Please try again in an hour.')
        return
    }

    console.log(`Time Penalty present. Retrying operation in ${time}s`)

    await waitForMs(time as number * 1000) 
    return await connect({ ...data, 'p-ticket': ticket })   
}

export const connect = async (data: AuthData): Promise<AuthResponse | undefined> => {
    const { token, expiration }: TokenInfo = getAccessToken()

    // If we have a token but it's expired, we should re-authenticate
    if (token && expiration && !tokenIsValid(expiration)) {
        console.log('Token expired. Re-authenticating...')
        // Clear the expired token
        setAccessToken('', '')
    }

    // If we don't have a valid token, authenticate
    if (!token || !expiration || !tokenIsValid(expiration)) {
        const authResponse = await tvPost('/auth/accesstokenrequest', data, false)

        if (authResponse['p-ticket']) {
            return await handleRetry(data, authResponse)
        }

        const { errorText, accessToken, userId, userStatus, name, expirationTime } = authResponse

        if (errorText) {
            console.error('Authentication error:', errorText)
            return
        }

        if (!accessToken || !expirationTime) {
            console.error('No access token or expiration time received')
            return
        }

        setAccessToken(accessToken, expirationTime)

        if (userId !== undefined && name) {
            setUserData({ userId, name })
        }
    }

    // At this point we should have a valid token, try to get accounts
    try {
        const accounts = await tvGet('/account/list')
        setAvailableAccounts(accounts)
        
        const tokenInfo = getAccessToken()
        const userData = getUserData() as UserData
        const { userId, name } = userData

        return {
            accessToken: tokenInfo.token || undefined,
            expirationTime: tokenInfo.expiration || undefined,
            userId,
            name
        }
    } catch (error) {
        console.error('Failed to fetch accounts:', error)
        // If we get a 401 here, clear the token and retry
        if (error instanceof Error && error.message.includes('401')) {
            setAccessToken('', '')
            return await connect(data)
        }
        throw error
    }
}