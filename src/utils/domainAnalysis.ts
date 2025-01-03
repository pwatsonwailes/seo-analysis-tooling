import { ParsedResult, DomainStats, SearchResult, SearchParameters } from '../types';

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
    urls: Set<string>;
    queries: Set<string>;
  }>();

  results.forEach(result => {
    const parsedData = parseApiResponse(result.response_data);
    if (!parsedData) return;

    const query = parsedData.search_parameters.query || '';
    
    parsedData.result.organic_results.forEach(item => {
      const domain = extractDomain(item.url);
      if (!domain) return;

      const stats = domainMap.get(domain) || {
        totalPositions: 0,
        count: 0,
        urls: new Set<string>(),
        queries: new Set<string>()
      };

      stats.totalPositions += item.position;
      stats.count += 1;
      stats.urls.add(item.url);
      if (query) stats.queries.add(query);

      domainMap.set(domain, stats);
    });
  });

  return Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      averagePosition: Number((stats.totalPositions / stats.count).toFixed(2)),
      occurrences: stats.count,
      uniqueUrls: Array.from(stats.urls),
      queries: Array.from(stats.queries)
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}