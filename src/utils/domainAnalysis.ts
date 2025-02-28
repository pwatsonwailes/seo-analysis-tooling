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

function isPartialMatch(query: string, portfolioTerms: string[]): boolean {
  const normalizedQuery = query.toLowerCase();
  return portfolioTerms.some(term => {
    const normalizedTerm = term.toLowerCase();
    return normalizedQuery.includes(normalizedTerm) || normalizedTerm.includes(normalizedQuery);
  });
}

export function analyzeDomains(results: ParsedResult[]): DomainStats[] {
  const domainMap = new Map<string, {
    positions: number[];
    searchVolumes: number[];
    count: number;
    urlRankings: Map<string, { term: string; position: number; searchVolume: number; estimatedTraffic: number; }[]>;
    queries: Set<string>;
  }>();

  // First pass: collect all data per domain
  results.forEach(result => {
    const parsedData = parseApiResponse(result.response_data);
    if (!parsedData) return;

    const query = parsedData.search_parameters.query || '';
    const searchVolume = result.search_volume || 0;
    
    parsedData.result.organic_results.forEach(item => {
      const domain = extractDomain(item.url);
      if (!domain) return;

      const stats = domainMap.get(domain) || {
        positions: [],
        searchVolumes: [],
        count: 0,
        urlRankings: new Map<string, { term: string; position: number; searchVolume: number; estimatedTraffic: number; }[]>(),
        queries: new Set<string>()
      };

      stats.positions.push(item.position);
      stats.searchVolumes.push(searchVolume);
      stats.count += 1;
      
      // Track URL rankings with estimated traffic
      if (query) {
        const urlKey = item.url;
        const urlRankings = stats.urlRankings.get(urlKey) || [];
        const estimatedTraffic = Math.floor(searchVolume * calculateTrafficShare(item.position));
        
        urlRankings.push({
          term: query,
          position: item.position,
          searchVolume: searchVolume,
          estimatedTraffic
        });
        
        stats.urlRankings.set(urlKey, urlRankings);
        stats.queries.add(query);
      }
      
      domainMap.set(domain, stats);
    });
  });

  // Second pass: calculate statistics
  const domainStats: DomainStats[] = [];

  for (const [domain, stats] of domainMap.entries()) {
    // Calculate average position
    const averagePosition = stats.positions.reduce((sum, pos) => sum + pos, 0) / stats.count;
    
    // Calculate total estimated traffic
    let totalEstimatedTraffic = 0;
    const urlRankings: UrlRanking[] = [];
    
    // Process URL rankings
    for (const [url, rankings] of stats.urlRankings.entries()) {
      // Sum up estimated traffic for this domain
      const urlTraffic = rankings.reduce((sum, r) => sum + r.estimatedTraffic, 0);
      totalEstimatedTraffic += urlTraffic;
      
      // Add to URL rankings
      urlRankings.push({
        url,
        rankings
      });
    }

    domainStats.push({
      domain,
      averagePosition: Number(averagePosition.toFixed(2)),
      occurrences: stats.count,
      urlRankings,
      queries: Array.from(stats.queries),
      totalEstimatedTraffic
    });
  }

  // Sort by total estimated traffic
  return domainStats.sort((a, b) => b.totalEstimatedTraffic - a.totalEstimatedTraffic);
}