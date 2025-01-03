// Validates if the stored result contains a proper API response
export function isValidApiResponse(data: any): boolean {
    try {
      // Check if we have the expected structure
      return (
        data?.response_data?.contents &&
        typeof data.response_data.contents === 'string' &&
        JSON.parse(data.response_data.contents)?.result?.organic_results?.length > 0
      );
    } catch {
      return false;
    }
  }