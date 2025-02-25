import { ParsedResult, DomainStats, SearchResult, SearchParameters, UrlRanking } from '../types';
import { calculateTrafficShare } from './trafficShare';
import { trafficShareKernel, estimateTrafficKernel, averagePositionKernel } from './gpuUtils';

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
      
      if (query) stats.queries.add(query);
      domainMap.set(domain, stats);
    });
  });

  // Second pass: GPU-accelerated calculations
  const domainStats: DomainStats[] = [];

  for (const [domain, stats] of domainMap.entries()) {
    // Pad arrays to match kernel output size
    const paddedPositions = [...stats.positions];
    const paddedSearchVolumes = [...stats.searchVolumes];
    while (paddedPositions.length < 1024) {
      paddedPositions.push(0);
      paddedSearchVolumes.push(0);
    }

    // Calculate traffic shares using GPU
    const trafficShares = trafficShareKernel(paddedPositions);
    
    // Calculate estimated traffic using GPU
    const estimatedTraffic = estimateTrafficKernel(
      paddedPositions,
      paddedSearchVolumes,
      trafficShares
    );

    // Calculate average position using GPU
    const averagePosition = averagePositionKernel(paddedPositions, stats.count);

    // Calculate total estimated traffic
    let totalEstimatedTraffic = 0;
    for (let i = 0; i < stats.count; i++) {
      totalEstimatedTraffic += estimatedTraffic[i];
    }

    domainStats.push({
      domain,
      averagePosition: Number(averagePosition[0].toFixed(2)),
      occurrences: stats.count,
      urlRankings: [], // We'll populate this separately
      queries: Array.from(stats.queries),
      totalEstimatedTraffic
    });
  }

  // Sort by total estimated traffic
  return domainStats.sort((a, b) => b.totalEstimatedTraffic - a.totalEstimatedTraffic);
}