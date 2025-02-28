import { ApiResult } from '../types';
import { withRateLimit } from '../utils/rateLimiter';

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds
const BATCH_SIZE = 5; // Process 5 URLs at once
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

// List of CORS proxies to try in order
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Cache for successful responses
const responseCache = new Map<string, {
  timestamp: number;
  data: ApiResult;
}>();

// Cache expiration time (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

async function fetchWithRetry(url: string, retries = 0, proxyIndex = 0): Promise<Response> {
  try {
    // Try each proxy in sequence
    if (proxyIndex >= CORS_PROXIES.length) {
      throw new Error('All CORS proxies failed');
    }

    const proxyUrl = CORS_PROXIES[proxyIndex](url);
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
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
      clearTimeout(timeoutId);
      throw error;
    }
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

// Check cache for a URL
function getCachedResult(url: string): ApiResult | null {
  const cached = responseCache.get(url);
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_EXPIRATION) {
    responseCache.delete(url);
    return null;
  }
  
  return cached.data;
}

// Save result to cache
function cacheResult(url: string, result: ApiResult): void {
  responseCache.set(url, {
    timestamp: Date.now(),
    data: result
  });
  
  // Clean up old cache entries periodically
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > CACHE_EXPIRATION) {
        responseCache.delete(key);
      }
    }
  }
}

export async function fetchApiDataBatch(urls: string[]): Promise<ApiResult[]> {
  return withRateLimit(async () => {
    // First check cache for all URLs
    const results: ApiResult[] = [];
    const urlsToFetch: string[] = [];
    
    for (const url of urls) {
      const cached = getCachedResult(url);
      if (cached) {
        results.push(cached);
      } else {
        urlsToFetch.push(url);
      }
    }
    
    // If all URLs were cached, return immediately
    if (urlsToFetch.length === 0) {
      return results;
    }
    
    // Fetch remaining URLs
    const fetchedResults = await Promise.all(
      urlsToFetch.map(async (url) => {
        try {
          const response = await fetchWithRetry(url);
          const result = await parseProxyResponse(response, url);
          
          // Cache successful results
          if (result.success) {
            cacheResult(url, result);
          }
          
          return result;
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
    
    return [...results, ...fetchedResults];
  });
}

// Keep single fetch for retries and individual requests
export async function fetchApiData(url: string): Promise<ApiResult> {
  // Check cache first
  const cached = getCachedResult(url);
  if (cached) return cached;
  
  const [result] = await fetchApiDataBatch([url]);
  return result;
}