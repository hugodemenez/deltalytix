'use server';

interface TradovateAuthRequestBody {
    name: string;
    password: string;
    appId: string;
    appVersion: string;
    cid: number;
    sec: string;
    deviceId: string;
    'p-ticket'?: string;
}

interface TradovateApiResponse {
    'p-ticket'?: string;
    'p-time'?: number;
    'p-captcha'?: boolean;
    accessToken?: string;
    mdAccessToken?: string;
    userId?: number;
    userStatus?: string;
    name?: string;
    expirationTime?: string | number;
    errorText?: string;
}

interface TradovateAuthResponse {
    accessToken: string;
    mdAccessToken: string;
    expirationTime: string;
    error?: string;
    requiresCaptcha?: boolean;
    captchaTicket?: string;
    captchaTime?: number;
    userId?: number;
    name?: string;
    userStatus?: string;
}

export async function getTradovateAccessToken(): Promise<TradovateAuthResponse> {
    try {
        if (!process.env.TRADOVATE_CID || !process.env.TRADOVATE_SECRET) {
            return {
                accessToken: '',
                mdAccessToken: '',
                expirationTime: '',
                error: 'Tradovate credentials not configured'
            };
        }

        // Generate a unique device ID
        const deviceId = crypto.randomUUID();

        const requestBody: TradovateAuthRequestBody = {
            name: process.env.TRADOVATE_USERNAME || '',
            password: process.env.TRADOVATE_PASSWORD || '',
            appId: 'Deltalytix',
            appVersion: '0.0.1',
            cid: parseInt(process.env.TRADOVATE_CID),
            sec: process.env.TRADOVATE_SECRET,
            deviceId: deviceId
        };

        console.log('requestBody', requestBody);

        const response = await fetch('https://live.tradovateapi.com/v1/auth/accessTokenRequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            return {
                accessToken: '',
                mdAccessToken: '',
                expirationTime: '',
                error: `API request failed: ${response.status} ${response.statusText}`
            };
        }

        const data: TradovateApiResponse = await response.json();
        console.log('response', data);
        
        // Check if captcha is required
        if (data['p-captcha'] === true) {
            return {
                accessToken: '',
                mdAccessToken: '',
                expirationTime: '',
                requiresCaptcha: true,
                captchaTicket: data['p-ticket'],
                captchaTime: data['p-time']
            };
        }

        // Check for valid token response
        if (!data.accessToken || !data.mdAccessToken) {
            return {
                accessToken: '',
                mdAccessToken: '',
                expirationTime: '',
                error: data.errorText || 'Invalid response structure from Tradovate API'
            };
        }

        return { 
            accessToken: data.accessToken,
            mdAccessToken: data.mdAccessToken,
            expirationTime: data.expirationTime as string,
            userId: data.userId,
            name: data.name,
            userStatus: data.userStatus
        };
    } catch (error) {
        return { 
            accessToken: '', 
            mdAccessToken: '',
            expirationTime: '',
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
} 