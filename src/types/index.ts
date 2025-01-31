import { SearchResult } from './searchTypes';

export interface UrlData {
  url: string;
  searchVolume: number;
  query: string;
  domain: string;
  language: string;
}

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
  id?: string;
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
  search_volume?: number;
  query?: string;
  domain?: string;
  language?: string;
}

export interface ParsedResult extends ApiResult {
  id: string;
  created_at: string;
  user_id: string;
}

export interface UrlRanking {
  url: string;
  rankings: {
    term: string;
    position: number;
    searchVolume: number;
    estimatedTraffic: number;
  }[];
}

export interface DomainStats {
  domain: string;
  averagePosition: number;
  occurrences: number;
  urlRankings: UrlRanking[];
  queries: string[];
  totalEstimatedTraffic: number;
}

export interface Portfolio {
  id: string;
  name: string;
  terms: string[];
  created_at: string;
}

export interface KeywordList {
  id: string;
  name: string;
  urls: string[];
  search_volumes: Record<string, number>;
  created_at: string;
}