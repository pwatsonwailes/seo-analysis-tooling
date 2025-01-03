import { ParsedResult, DomainStats } from '../types';

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
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
    if (!result.response_data?.result?.organic_results) return;

    const query = result.response_data.search_parameters?.query || '';
    
    result.response_data.result.organic_results.forEach(item => {
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
      stats.queries.add(query);

      domainMap.set(domain, stats);
    });
  });

  return Array.from(domainMap.entries()).map(([domain, stats]) => ({
    domain,
    averagePosition: stats.totalPositions / stats.count,
    occurrences: stats.count,
    uniqueUrls: Array.from(stats.urls),
    queries: Array.from(stats.queries)
  })).sort((a, b) => b.occurrences - a.occurrences);
}