import { ParsedResult, DomainStats, SearchResult, SearchParameters, UrlRanking } from '../types';
import { calculateTrafficShare } from './trafficShare';

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

interface ParsedApiResponse {
  result: SearchResult;
  search_parameters: SearchParameters;
}

function parseApiResponse(responseData: ParsedResult['response_data']): ParsedApiResponse | null {
  try {
    if (!responseData.contents) return null;
    const parsed = JSON.parse(responseData.contents);
    if (!parsed.result?.organic_results) return null;
    
    return {
      result: parsed.result,
      search_parameters: parsed.search_parameters || {}
    };
  } catch {
    return null;
  }
}

export function analyzeDomains(results: ParsedResult[]): DomainStats[] {
  const domainMap = new Map<string, {
    totalPositions: number;
    count: number;
    urlRankings: Map<string, { term: string; position: number; searchVolume: number; estimatedTraffic: number; }[]>;
    queries: Set<string>;
    totalEstimatedTraffic: number;
  }>();

  results.forEach(result => {
    const parsedData = parseApiResponse(result.response_data);
    if (!parsedData) return;

    const query = parsedData.search_parameters.query || '';
    const searchVolume = result.search_volume || 0;
    
    parsedData.result.organic_results.forEach(item => {
      const domain = extractDomain(item.url);
      if (!domain) return;

      const stats = domainMap.get(domain) || {
        totalPositions: 0,
        count: 0,
        urlRankings: new Map<string, { term: string; position: number; searchVolume: number; estimatedTraffic: number; }[]>(),
        queries: new Set<string>(),
        totalEstimatedTraffic: 0
      };

      const trafficShare = calculateTrafficShare(item.position);
      const estimatedTraffic = Math.round(searchVolume * trafficShare);

      stats.totalPositions += item.position;
      stats.count += 1;
      stats.totalEstimatedTraffic += estimatedTraffic;
      
      // Track rankings per URL
      const urlRankings = stats.urlRankings.get(item.url) || [];
      urlRankings.push({ 
        term: query, 
        position: item.position,
        searchVolume,
        estimatedTraffic
      });
      stats.urlRankings.set(item.url, urlRankings);
      
      if (query) stats.queries.add(query);
      domainMap.set(domain, stats);
    });
  });

  return Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      averagePosition: Number((stats.totalPositions / stats.count).toFixed(2)),
      occurrences: stats.count,
      urlRankings: Array.from(stats.urlRankings.entries()).map(([url, rankings]) => ({
        url,
        rankings
      })),
      queries: Array.from(stats.queries),
      totalEstimatedTraffic: stats.totalEstimatedTraffic
    }))
    .sort((a, b) => b.totalEstimatedTraffic - a.totalEstimatedTraffic);
}