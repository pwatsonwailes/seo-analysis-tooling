import { ApiResult } from '../types';
import { withRateLimit } from '../utils/rateLimiter';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

export async function fetchApiData(url: string): Promise<ApiResult> {
  return withRateLimit(async () => {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetchWithRetry(proxyUrl);
    const proxyData = await response.json();
    
    return {
      url,
      response_data: proxyData,
      status: response.status,
      success: response.ok
    };
  });
}