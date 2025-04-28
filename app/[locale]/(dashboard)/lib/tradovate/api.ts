const DEMO_URL = 'https://demo.tradovateapi.com/v1';
const LIVE_URL = 'https://live.tradovateapi.com/v1';

export type Environment = 'demo' | 'live';

// Rate limiting configuration
const API_RATE_LIMITS = {
  // Allow multiple requests with a minimum gap in ms
  minRequestGap: 200, // 200ms minimum between requests
  // Backoff strategy for retries (exponential)
  initialBackoff: 1000, // Start with 1s backoff
  maxBackoff: 60000, // Max 60s backoff
  backoffFactor: 1.5, // Increase backoff by 1.5x on each attempt
  maxRetries: 5, // Maximum number of retries
};

// In-memory store for rate limiting
let lastRequestTime = 0;
let pendingRequests: Map<string, {
  timeout: NodeJS.Timeout,
  resolve: (value: any) => void,
  reject: (reason: any) => void,
}> = new Map();

// Pending tickets from rate limit responses
interface PendingTicket {
  ticket: string;
  validUntil: number; // Timestamp when ticket expires
}
const pendingTickets: Map<string, PendingTicket> = new Map();

interface RequestOptions {
    endpoint: string;
    method: 'GET' | 'POST';
    data?: any;
    query?: Record<string, any>;
    useToken?: boolean;
    env?: Environment;
    retry?: number; // Current retry count
    backoff?: number; // Current backoff time
}

// Ensure requests respect rate limits
function enforceRateLimit(requestId: string): Promise<void> {
  const now = Date.now();
  const timeToWait = Math.max(0, lastRequestTime + API_RATE_LIMITS.minRequestGap - now);
  
  return new Promise((resolve, reject) => {
    if (timeToWait <= 0) {
      // Can send immediately
      lastRequestTime = now;
      resolve();
    } else {
      // Need to wait
      const timeout = setTimeout(() => {
        lastRequestTime = Date.now();
        pendingRequests.delete(requestId);
        resolve();
      }, timeToWait);
      
      pendingRequests.set(requestId, {
        timeout,
        resolve,
        reject
      });
    }
  });
}

function cancelRateLimitWait(requestId: string): void {
  const pending = pendingRequests.get(requestId);
  if (pending) {
    clearTimeout(pending.timeout);
    pending.reject(new Error('Request cancelled'));
    pendingRequests.delete(requestId);
  }
}

async function makeRequest({ endpoint, method, data, query, useToken = true, env = 'live', retry = 0, backoff = API_RATE_LIMITS.initialBackoff }: RequestOptions) {
    const baseURL = env === 'demo' ? DEMO_URL : LIVE_URL;
    
    let url = baseURL + endpoint;
    if (query) {
        const queryString = new URLSearchParams(
            Object.entries(query).map(([k, v]) => [k, String(v)])
        ).toString();
        url += `?${queryString}`;
    }

    const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    if (useToken) {
        // We'll implement token storage/retrieval
        const token = localStorage.getItem('tvAccessToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Check if we have a ticket for this endpoint (for retries)
    const requestId = `${method}-${endpoint}`;
    let requestData = data;
    
    const ticketInfo = pendingTickets.get(requestId);
    if (ticketInfo && ticketInfo.validUntil > Date.now()) {
      // Add ticket to request
      requestData = {
        ...requestData,
        "p-ticket": ticketInfo.ticket
      };
      pendingTickets.delete(requestId); // Use the ticket only once
    }
    
    // Enforce rate limiting
    try {
      await enforceRateLimit(requestId);
    } catch (error) {
      return Promise.reject(error);
    }

    try {
        const response = await fetch(url, {
            method,
            headers,
            ...(requestData ? { body: JSON.stringify(requestData) } : {}),
        });

        // Handle rate limit response
        if (response.status === 429) {
            // Too Many Requests
            if (retry >= API_RATE_LIMITS.maxRetries) {
                throw new Error(`Rate limit exceeded after ${retry} retries`);
            }
            
            // Parse the response to check for ticket and time
            const responseData = await response.json();
            
            if (responseData['p-captcha']) {
                // This requires human intervention
                throw new Error('CAPTCHA_REQUIRED');
            }
            
            if (responseData['p-ticket'] && responseData['p-time']) {
                // Store the ticket for future requests
                const ticket = responseData['p-ticket'];
                const waitTime = responseData['p-time'] * 1000; // Convert to milliseconds
                
                pendingTickets.set(requestId, {
                    ticket,
                    validUntil: Date.now() + waitTime + 5000 // Add 5s buffer
                });
                
                console.warn(`Rate limited for ${endpoint}. Retrying in ${waitTime}ms with ticket.`);
                
                // Wait for the specified time
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                // Retry the request
                return makeRequest({
                    endpoint, 
                    method, 
                    data, 
                    query, 
                    useToken, 
                    env,
                    retry: retry + 1,
                    backoff: Math.min(backoff * API_RATE_LIMITS.backoffFactor, API_RATE_LIMITS.maxBackoff)
                });
            } else {
                // No ticket provided, use exponential backoff
                const waitTime = backoff;
                
                console.warn(`Rate limited for ${endpoint}. Backing off for ${waitTime}ms.`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                return makeRequest({
                    endpoint, 
                    method, 
                    data, 
                    query, 
                    useToken, 
                    env,
                    retry: retry + 1,
                    backoff: Math.min(backoff * API_RATE_LIMITS.backoffFactor, API_RATE_LIMITS.maxBackoff)
                });
            }
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        if (error instanceof Error && error.message !== 'CAPTCHA_REQUIRED') {
            // For non-captcha errors, retry with backoff if we haven't hit max retries
            if (retry < API_RATE_LIMITS.maxRetries) {
                const waitTime = backoff;
                console.warn(`Request failed for ${endpoint}. Retrying in ${waitTime}ms.`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                return makeRequest({
                    endpoint, 
                    method, 
                    data, 
                    query, 
                    useToken, 
                    env,
                    retry: retry + 1,
                    backoff: Math.min(backoff * API_RATE_LIMITS.backoffFactor, API_RATE_LIMITS.maxBackoff)
                });
            }
        }
        throw error;
    }
}

export async function tvGet(endpoint: string, query?: Record<string, any>, env: Environment = 'live') {
    return makeRequest({ endpoint, method: 'GET', query, env });
}

export async function tvPost(endpoint: string, data: any, useToken = true, env: Environment = 'live') {
    return makeRequest({ endpoint, method: 'POST', data, useToken, env });
}

interface TokenResponse {
    accessToken: string;
    mdAccessToken: string;
    expirationTime: string;
    userId: number;
    name: string;
    hasLive: boolean;
}

export async function getAccessToken(credentials: {
    name: string;
    password: string;
    cid: number;
    sec: string;
    env?: Environment;
}): Promise<TokenResponse> {
    const { env = 'live', ...creds } = credentials;
    
    const data = {
        ...creds,
        appId: 'Sample App',
        appVersion: '1.0',
        deviceId: crypto.randomUUID()
    };

    try {
        const response = await tvPost('/auth/accessTokenRequest', data, false, env);
        
        if (response['p-captcha']) {
            // Create an enhanced error with CAPTCHA info
            const error = new Error('CAPTCHA_REQUIRED') as any;
            error.captchaInfo = {
                ticket: response['p-ticket'] || '',
                time: response['p-time'] || 3600 // Default 1 hour if not specified
            };
            throw error;
        }

        // Store the tokens
        localStorage.setItem('tvAccessToken', response.accessToken);
        localStorage.setItem('tvMdAccessToken', response.mdAccessToken);
        localStorage.setItem('tvTokenExpiration', response.expirationTime);

        return response;
    } catch (error) {
        console.warn('Failed to get access token:', error);
        throw error;
    }
}

export function clearTokens() {
    localStorage.removeItem('tvAccessToken');
    localStorage.removeItem('tvMdAccessToken');
    localStorage.removeItem('tvTokenExpiration');
}

export function getStoredTokens() {
    return {
        accessToken: localStorage.getItem('tvAccessToken'),
        mdAccessToken: localStorage.getItem('tvMdAccessToken'),
        expirationTime: localStorage.getItem('tvTokenExpiration'),
    };
}

export function isTokenExpired(): boolean {
    const expirationTime = localStorage.getItem('tvTokenExpiration');
    if (!expirationTime) return true;
    
    // Return true if token expires in less than 5 minutes
    const expiry = new Date(expirationTime).getTime();
    const now = Date.now();
    return (expiry - now) < 5 * 60 * 1000;
} 