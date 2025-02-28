import type { ParsedResult } from '../types';

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Helper function to safely parse JSON
function safeJsonParse(jsonString: string | undefined) {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

// Process chunks of data in the worker
self.onmessage = (e: MessageEvent) => {
  const { results } = e.data;
  
  try {
    const domainData = new Map();
    const totalResults = results.length;
    let processedCount = 0;
    
    // Process in smaller batches to avoid UI freezing
    const BATCH_SIZE = 100;
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, totalResults);
      
      for (let i = startIndex; i < endIndex; i++) {
        const result = results[i];
        if (!result || !result.response_data) continue;
        
        const parsedData = safeJsonParse(result.response_data.contents);
        if (!parsedData || !parsedData.result?.organic_results) continue;
        
        const query = parsedData.search_parameters?.query || '';
        const searchVolume = result.search_volume || 0;
        
        parsedData.result.organic_results.forEach(item => {
          if (!item || !item.url) return;
          
          const domain = extractDomain(item.url);
          if (!domain) return;

          const stats = domainData.get(domain) || {
            positions: [],
            searchVolumes: [],
            urlRankings: new Map(),
            queries: new Set()
          };

          stats.positions.push(item.position);
          stats.searchVolumes.push(searchVolume);
          
          // Track URL rankings
          const urlKey = item.url;
          const urlRankings = stats.urlRankings.get(urlKey) || [];
          
          if (query) {
            urlRankings.push({
              term: query,
              position: item.position,
              searchVolume: searchVolume
            });
            stats.urlRankings.set(urlKey, urlRankings);
            stats.queries.add(query);
          }
          
          domainData.set(domain, stats);
        });
      }
      
      processedCount = endIndex;
      
      // Report progress
      self.postMessage({
        type: 'progress',
        data: Math.round((processedCount / totalResults) * 100)
      });
      
      // Process next batch or finish
      if (processedCount < totalResults) {
        setTimeout(() => processBatch(processedCount), 0);
      } else {
        // Convert data for main thread processing
        const preparedData = Array.from(domainData.entries()).map(([domain, stats]) => {
          // Convert URL rankings to array format
          const urlRankings = Array.from(stats.urlRankings.entries()).map(([url, rankings]) => ({
            url,
            rankings
          }));
          
          return {
            domain,
            positions: stats.positions,
            searchVolumes: stats.searchVolumes,
            occurrences: stats.positions.length,
            urlRankings,
            queries: Array.from(stats.queries)
          };
        });

        self.postMessage({ type: 'complete', data: preparedData });
      }
    };
    
    // Start processing
    processBatch(0);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Processing failed'
    });
  }
};