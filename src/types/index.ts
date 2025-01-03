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
  
  export interface ParsedResult {
    id: string;
    url: string;
    response_data: {
      result: SearchResult;
      search_parameters: SearchParameters;
    };
    status: number;
    success: boolean;
    error?: string;
  }
  
  export interface DomainStats {
    domain: string;
    averagePosition: number;
    occurrences: number;
    uniqueUrls: string[];
    queries: string[];
  }