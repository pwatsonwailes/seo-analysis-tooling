import { GPU } from 'gpu.js';
import memoizee from 'memoizee';

// Create GPU instance with optimized settings
const gpu = new GPU({
  mode: 'gpu',
  tactic: 'precision',
  optimizeFloatMemory: true,
  allowGPUFallback: true
});

// Optimize kernel for traffic share calculations with dynamic output size
const createTrafficShareKernel = (size: number) => gpu.createKernel(function(positions: number[]) {
  const position = positions[this.thread.x];
  
  // Optimized branching for GPU
  const pos = Math.floor(position);
  return (
    pos <= 1 ? 0.30 :
    pos <= 2 ? 0.13 :
    pos <= 3 ? 0.09 :
    pos <= 4 ? 0.06 :
    pos <= 5 ? 0.04 :
    pos <= 6 ? 0.03 :
    pos <= 7 ? 0.023 :
    pos <= 8 ? 0.019 :
    pos <= 9 ? 0.019 :
    pos <= 10 ? 0.017 :
    pos <= 15 ? 0.013 :
    pos <= 20 ? 0.01 :
    pos <= 30 ? 0.002 :
    0
  );
}).setOutput([size])
  .setPipeline(true)
  .setImmutable(true);

// Memoize kernel creation for different sizes
const memoizedCreateTrafficShareKernel = memoizee(createTrafficShareKernel, {
  primitive: true,
  max: 10 // Cache up to 10 different kernel sizes
});

// Optimized kernel for traffic estimation
const createEstimateTrafficKernel = (size: number) => gpu.createKernel(function(
  positions: number[],
  searchVolumes: number[],
  trafficShares: number[]
) {
  const idx = this.thread.x;
  return Math.floor(searchVolumes[idx] * trafficShares[idx]);
}).setOutput([size])
  .setPipeline(true)
  .setImmutable(true);

const memoizedCreateEstimateTrafficKernel = memoizee(createEstimateTrafficKernel, {
  primitive: true,
  max: 10
});

// Optimized kernel for average position calculation
const createAveragePositionKernel = (size: number) => gpu.createKernel(function(
  positions: number[],
  count: number
) {
  let sum = 0;
  const validCount = Math.min(this.constants.size, count);
  for (let i = 0; i < validCount; i++) {
    sum += positions[i];
  }
  return sum / validCount;
}).setOutput([1])
  .setConstants({ size })
  .setPipeline(true)
  .setImmutable(true);

const memoizedCreateAveragePositionKernel = memoizee(createAveragePositionKernel, {
  primitive: true,
  max: 10
});

// Helper function to get optimal batch size
function getOptimalBatchSize(length: number): number {
  // Round up to nearest power of 2 for optimal GPU performance
  const power = Math.ceil(Math.log2(length));
  return Math.pow(2, power);
}

export function processWithGPU(positions: number[], searchVolumes: number[]) {
  const batchSize = getOptimalBatchSize(positions.length);
  
  // Get or create optimized kernels for this batch size
  const trafficShareKernel = memoizedCreateTrafficShareKernel(batchSize);
  const estimateTrafficKernel = memoizedCreateEstimateTrafficKernel(batchSize);
  const averagePositionKernel = memoizedCreateAveragePositionKernel(batchSize);

  // Pad arrays to match batch size
  const paddedPositions = new Float32Array(batchSize);
  const paddedSearchVolumes = new Float32Array(batchSize);
  
  paddedPositions.set(positions);
  paddedSearchVolumes.set(searchVolumes);

  // Execute GPU calculations
  const trafficShares = trafficShareKernel(paddedPositions);
  const estimatedTraffic = estimateTrafficKernel(paddedPositions, paddedSearchVolumes, trafficShares);
  const averagePosition = averagePositionKernel(paddedPositions, positions.length);

  // Clean up textures
  trafficShares.delete();
  estimatedTraffic.delete();

  return {
    trafficShares: Array.from(trafficShares.toArray()).slice(0, positions.length),
    estimatedTraffic: Array.from(estimatedTraffic.toArray()).slice(0, positions.length),
    averagePosition: averagePosition.toArray()[0]
  };
}