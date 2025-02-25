import { useState, useCallback } from 'react';
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
          setAnalyzing(false);
          setProgress(100);
          resolve(data);
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