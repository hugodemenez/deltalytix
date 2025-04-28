// Your CryptoCompare API key
export const apiKey = process.env.NEXT_PUBLIC_CRYPTOCOMPARE_API_KEY;

// Makes requests to CryptoCompare API
export async function makeApiRequest(path: string) {
    try {
        const url = new URL(`https://data-api.coindesk.com/${path}`);
        url.searchParams.append('api_key', apiKey as string);
        const response = await fetch(url.toString());
        return response.json();
    } catch (error: any) {
        throw new Error(`CryptoCompare request error: ${error.status}`);
    }
}

// Generates a symbol ID from a pair of the coins
export function generateSymbol(exchange: string, fromSymbol: string, toSymbol: string) {
    const short = `${fromSymbol}/${toSymbol}`;
    return {
        short,
    };
}

export function parseFullSymbol(fullSymbol: string) {
    const match = fullSymbol.match(/^(\w+)-(\w+)$/);
    if (!match) {
        return null;
    }
    return { fromSymbol: match[1], toSymbol: match[2] };
}