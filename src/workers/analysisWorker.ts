import { processWithGPU } from '../utils/gpuUtils';
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

// Process chunks of data in the worker
self.onmessage = (e: MessageEvent) => {
  const { results, chunkSize = 1000 } = e.data;
  
  // Process in chunks to avoid blocking
  const processChunk = async (chunk: ParsedResult[]) => {
    const domainData = new Map();
    
    // First pass: collect data per domain
    chunk.forEach(result => {
      try {
        const parsedData = JSON.parse(result.response_data.contents || '{}');
        const query = parsedData.search_parameters?.query || '';
        const searchVolume = result.search_volume || 0;
        
        parsedData.result?.organic_results?.forEach(item => {
          const domain = extractDomain(item.url);
          if (!domain) return;

          const stats = domainData.get(domain) || {
            positions: [],
            searchVolumes: [],
            urls: new Set(),
            queries: new Set()
          };

          stats.positions.push(item.position);
          stats.searchVolumes.push(searchVolume);
          stats.urls.add(item.url);
          if (query) stats.queries.add(query);
          
          domainData.set(domain, stats);
        });
      } catch (error) {
        console.error('Error processing result:', error);
      }
    });

    // Second pass: GPU calculations for each domain
    const processedData = [];
    for (const [domain, stats] of domainData.entries()) {
      const {
        trafficShares,
        estimatedTraffic,
        averagePosition
      } = processWithGPU(stats.positions, stats.searchVolumes);

      processedData.push({
        domain,
        averagePosition,
        occurrences: stats.positions.length,
        urls: Array.from(stats.urls),
        queries: Array.from(stats.queries),
        totalEstimatedTraffic: estimatedTraffic.reduce((a, b) => a + b, 0)
      });
    }

    return processedData;
  };

  // Process all chunks
  const chunks = [];
  for (let i = 0; i < results.length; i += chunkSize) {
    chunks.push(results.slice(i, i + chunkSize));
  }

  Promise.all(chunks.map(processChunk))
    .then(processedChunks => {
      // Merge chunks and send back results
      const mergedData = processedChunks.flat();
      self.postMessage({ type: 'complete', data: mergedData });
    })
    .catch(error => {
      self.postMessage({ type: 'error', error: error.message });
    });
};