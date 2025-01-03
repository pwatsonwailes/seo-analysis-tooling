export interface OrganicResult {
  position: number;
  title: string;
  url: string;
  description: string;
}

export interface SearchParameters {
  query: string;
  type: string;
  google_domain: string;
}

export interface SearchResult {
  organic_results: OrganicResult[];
}

export interface ApiResult {
  id?: string;  // Make id optional for ApiResult
  url: string;
  response_data: {
    contents?: string;
    status?: {
      url: string;
      content_type: string;
      http_code: number;
      response_time: number;
    };
  };
  status: number;
  success: boolean;
  error?: string;
}

export interface ParsedResult extends ApiResult {
  id: string;  // Required for ParsedResult
  created_at: string;
  user_id: string;
}

export interface DomainStats {
  domain: string;
  averagePosition: number;
  occurrences: number;
  uniqueUrls: string[];
  queries: string[];
}