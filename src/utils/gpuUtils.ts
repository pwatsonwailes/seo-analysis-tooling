import memoizee from 'memoizee';
import { calculateTrafficShareBatch, calculateEstimatedTrafficBatch, calculateAveragePosition } from './trafficShare';

// Memoize expensive calculations
const memoizedTrafficShareBatch = memoizee(calculateTrafficShareBatch, {
  primitive: true,
  max: 100,
  length: 1
});

const memoizedEstimatedTrafficBatch = memoizee(calculateEstimatedTrafficBatch, {
  primitive: true,
  max: 100,
  length: 2
});

const memoizedAveragePosition = memoizee(calculateAveragePosition, {
  primitive: true,
  max: 100,
  length: 1
});

// Process data in optimized batches
export function processWithOptimizedJS(positions: number[], searchVolumes: number[]) {
  if (!positions.length || !searchVolumes.length) {
    return {
      trafficShares: [],
      estimatedTraffic: [],
      averagePosition: 0
    };
  }

  try {
    // Use web workers for large datasets
    if (positions.length > 10000) {
      // For very large datasets, we'll process in chunks
      const CHUNK_SIZE = 5000;
      const chunks = Math.ceil(positions.length / CHUNK_SIZE);
      
      let trafficShares: number[] = [];
      let estimatedTraffic: number[] = [];
      
      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, positions.length);
        
        const chunkPositions = positions.slice(start, end);
        const chunkSearchVolumes = searchVolumes.slice(start, end);
        
        trafficShares = trafficShares.concat(memoizedTrafficShareBatch(chunkPositions));
        estimatedTraffic = estimatedTraffic.concat(
          memoizedEstimatedTrafficBatch(chunkPositions, chunkSearchVolumes)
        );
      }
      
      return {
        trafficShares,
        estimatedTraffic,
        averagePosition: memoizedAveragePosition(positions)
      };
    }
    
    // For smaller datasets, process all at once
    return {
      trafficShares: memoizedTrafficShareBatch(positions),
      estimatedTraffic: memoizedEstimatedTrafficBatch(positions, searchVolumes),
      averagePosition: memoizedAveragePosition(positions)
    };
  } catch (error) {
    console.error('Processing error:', error);
    // Fallback to simple calculation
    return {
      trafficShares: positions.map(p => p <= 1 ? 0.30 : p <= 2 ? 0.13 : 0.01),
      estimatedTraffic: positions.map((p, i) => Math.floor(searchVolumes[i] * (p <= 1 ? 0.30 : p <= 2 ? 0.13 : 0.01))),
      averagePosition: positions.reduce((a, b) => a + b, 0) / positions.length
    };
  }
}

// For backward compatibility
export const processWithGPU = processWithOptimizedJS;