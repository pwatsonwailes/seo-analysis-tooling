import { ApiResult } from '../types';
import { withRateLimit } from '../utils/rateLimiter';

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds
const BATCH_SIZE = 5; // Process 5 URLs at once

// List of CORS proxies to try in order
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

async function fetchWithRetry(url: string, retries = 0, proxyIndex = 0): Promise<Response> {
  try {
    // Try each proxy in sequence
    if (proxyIndex >= CORS_PROXIES.length) {
      throw new Error('All CORS proxies failed');
    }

    const proxyUrl = CORS_PROXIES[proxyIndex](url);
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      // If this proxy fails, try the next one
      if (proxyIndex < CORS_PROXIES.length - 1) {
        return fetchWithRetry(url, retries, proxyIndex + 1);
      }
      
      // If all proxies failed and we have retries left, start over with the first proxy
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
        return fetchWithRetry(url, retries + 1, 0);
      }
    }
    
    return response;
  } catch (error) {
    // If network error occurs and we have retries left, try the next proxy
    if (proxyIndex < CORS_PROXIES.length - 1) {
      return fetchWithRetry(url, retries, proxyIndex + 1);
    }
    
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return fetchWithRetry(url, retries + 1, 0);
    }
    throw error;
  }
}

async function parseProxyResponse(response: Response, originalUrl: string): Promise<ApiResult> {
  try {
    const data = await response.json();
    
    // Handle different proxy response formats
    let contents = data;
    if ('contents' in data) {
      // allorigins format
      contents = data.contents;
    }
    
    return {
      url: originalUrl,
      response_data: { contents: typeof contents === 'string' ? contents : JSON.stringify(contents) },
      status: response.status,
      success: response.ok
    };
  } catch (error) {
    return {
      url: originalUrl,
      response_data: {},
      status: response.status,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse response'
    };
  }
}

export async function fetchApiDataBatch(urls: string[]): Promise<ApiResult[]> {
  return withRateLimit(async () => {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetchWithRetry(url);
          return await parseProxyResponse(response, url);
        } catch (error) {
          return {
            url,
            response_data: {},
            status: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch data'
          };
        }
      })
    );
    
    return results;
  });
}

// Keep single fetch for retries and individual requests
export async function fetchApiData(url: string): Promise<ApiResult> {
  const [result] = await fetchApiDataBatch([url]);
  return result;
}
