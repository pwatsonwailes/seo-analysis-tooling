import { ApiResult } from '../types';

export async function fetchApiData(url: string): Promise<ApiResult> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  const proxyData = await response.json();
  
  return {
    url,
    response_data: proxyData,
    status: response.status,
    success: response.ok
  };
}