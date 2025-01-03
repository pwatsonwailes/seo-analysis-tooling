import type { ParsedResult } from '../types';

export function isValidApiResponse(data: ParsedResult): boolean {
  try {
    if (!data?.response_data?.contents) return false;
    
    const parsedContents = JSON.parse(data.response_data.contents);
    return Boolean(
      parsedContents?.result?.organic_results?.length > 0
    );
  } catch {
    return false;
  }
}