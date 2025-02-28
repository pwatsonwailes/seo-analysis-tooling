import { useState, useCallback } from 'react';
import { processWithOptimizedJS } from '../utils/gpuUtils';
import type { ParsedResult, DomainStats } from '../types';

// Create a worker instance
const worker = new Worker(
  new URL('../workers/analysisWorker.ts', import.meta.url),
  { type: 'module' }
);

export function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback((results: ParsedResult[]): Promise<DomainStats[]> => {
    return new Promise((resolve, reject) => {
      setAnalyzing(true);
      setProgress(0);
      setError(null);

      const handleMessage = (e: MessageEvent) => {
        const { type, data, error } = e.data;
        
        if (type === 'complete') {
          worker.removeEventListener('message', handleMessage);
          
          // Process the prepared data with optimized JS on the main thread
          try {
            const processedData = data.map(item => {
              const { positions, searchVolumes, ...rest } = item;
              
              // Use optimized JS processing instead of GPU
              const jsResults = processWithOptimizedJS(positions, searchVolumes);
              
              return {
                ...rest,
                averagePosition: Number(jsResults.averagePosition.toFixed(2)),
                totalEstimatedTraffic: jsResults.estimatedTraffic.reduce((a, b) => a + b, 0)
              };
            });

            setAnalyzing(false);
            setProgress(100);
            resolve(processedData.sort((a, b) => b.totalEstimatedTraffic - a.totalEstimatedTraffic));
          } catch (error) {
            setAnalyzing(false);
            setError(error instanceof Error ? error.message : 'Processing failed');
            reject(error);
          }
        } else if (type === 'error') {
          worker.removeEventListener('message', handleMessage);
          setAnalyzing(false);
          setError(error);
          reject(new Error(error));
        } else if (type === 'progress') {
          setProgress(data);
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ results });
    });
  }, []);

  return {
    analyze,
    analyzing,
    progress,
    error
  };
}