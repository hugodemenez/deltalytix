import { getAccessToken } from './storage'
import { URLs } from './urls'

const { DEMO_URL, LIVE_URL } = URLs

interface ApiError extends Error {
    status?: number;
    response?: any;
}

/**
 * Call to make GET requests to the Tradovate REST API. The passed `query` object will be reconstructed to a query string and placed in the query position of the URL.
 * ```js
 * //no parameters
 *  const jsonResponseA = await tvGet('/account/list')
 *
 * //parameter object, URL will become '/contract/item?id=2287764'
 * const jsonResponseB = await tvGet('/contract/item', { id: 2287764 })
 * ```
 * 
 * New! You can interact with the browser devolopers' console. In the console enter commands:
 * ```
 * > tradovate.get('/account/list') //=> account data []
 * > tradovate.get('/contract/item', {id: 12345}) //=> maybe contract
 * ```
 * 
 * @param {string} endpoint 
 * @param {{[k:string]: any}} query object key-value-pairs will be converted into query, for ?masterid=1234 use `{masterid: 1234}`
 * @param {'demo' | 'live'} env 
 * @returns 
 */
export const tvGet = async (endpoint: string, query: Record<string, any> | null = null, env: 'demo' | 'live' = 'live') => {
    const { token } = getAccessToken()
    
    if (!token) {
        throw new Error('No access token available. Please authenticate first.')
    }

    try {
        let q = ''
        if(query) {
            q = Object.keys(query).reduce((acc, next, i, arr) => {
                acc += next + '=' + query[next]
                if(i !== arr.length - 1) acc += '&'
                return acc
            }, '?')
        }

        console.log('With query:', q.toString() || '<no query>')

        let baseURL = env === 'demo' ? DEMO_URL : env === 'live' ? LIVE_URL : ''        
        if(!baseURL) throw new Error(`[Services:tvGet] => 'env' variable should be either 'live' or 'demo'.`)

        let url = query !== null
            ? baseURL + endpoint + q
            : baseURL + endpoint

        console.log(url)

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })

        if (!res.ok) {
            const error = new Error(`API request failed with status ${res.status}`) as ApiError
            error.status = res.status
            error.response = await res.json().catch(() => null)
            throw error
        }

        return await res.json()

    } catch(err) {
        if (err instanceof Error) {
            const apiError = err as ApiError
            if (apiError.status === 401) {
                throw new Error('Authentication failed. Please re-authenticate.')
            }
            console.error('API Error:', {
                message: apiError.message,
                status: apiError.status,
                response: apiError.response
            })
        }
        throw err
    }
}

/**
 * Use this function to make POST requests to the Tradovate REST API. `data` will be placed in the body of the request as JSON.
 * ```js
 * //placing an order with tvPost 
 * const jsonResponseC = await tvPost('/order/placeorder', {
 *   accountSpec: myAcct.name,
 *   accountId: myAcct.id,
 *   action: 'Buy',
 *   symbol: 'MNQM1',
 *   orderQty: 2,
 *   orderType: 'Market',
 *   isAutomated: true //was this order placed by you or your robot?
 * })
 * ```
 * 
 * @param {string} endpoint 
 * @param {{[k:string]: any}} data 
 * @param {boolean} _usetoken 
 * @param {'live' | 'demo'} env 
 * @returns 
 */
export const tvPost = async (endpoint: string, data: Record<string, any>, _usetoken: boolean = true, env: 'demo' | 'live' = 'live') => {
    const { token } = getAccessToken()

    if (_usetoken && !token) {
        throw new Error('No access token available. Please authenticate first.')
    }

    let baseURL = env === 'demo' ? DEMO_URL : env === 'live' ? LIVE_URL : ''
    if(!baseURL) throw new Error(`[Services:tvPost] => 'env' variable should be either 'live' or 'demo'.`)

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(_usetoken ? { Authorization: `Bearer ${token}` } : {})
    }

    try {
        const res = await fetch(baseURL + endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        })

        if (!res.ok) {
            const error = new Error(`API request failed with status ${res.status}`) as ApiError
            error.status = res.status
            error.response = await res.json().catch(() => null)
            throw error
        }

        return await res.json()

    } catch(err) {
        if (err instanceof Error) {
            const apiError = err as ApiError
            if (apiError.status === 401) {
                throw new Error('Authentication failed. Please re-authenticate.')
            }
            console.error('API Error:', {
                message: apiError.message,
                status: apiError.status,
                response: apiError.response
            })
        }
        throw err
    }
}