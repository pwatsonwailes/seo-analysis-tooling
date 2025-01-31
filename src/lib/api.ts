import { ApiResult } from '../types';
import { withRateLimit } from '../utils/rateLimiter';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const BATCH_SIZE = 10; // Process 10 URLs at once

async function fetchWithRetry(url: string, retries = 0): Promise<Response> {
  try {
    const response = await fetch(url);
    
    if (!response.ok && retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return fetchWithRetry(url, retries + 1);
    }
    
    return response;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return fetchWithRetry(url, retries + 1);
    }
    throw error;
  }
}

export async function fetchApiDataBatch(urls: string[]): Promise<ApiResult[]> {
  return withRateLimit(async () => {
    const proxyUrls = urls.map(url => 
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    
    const responses = await Promise.all(
      proxyUrls.map(url => fetchWithRetry(url))
    );
    
    const results = await Promise.all(
      responses.map(async (response, index) => {
        const proxyData = await response.json();
        return {
          url: urls[index],
          response_data: proxyData,
          status: response.status,
          success: response.ok
        };
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