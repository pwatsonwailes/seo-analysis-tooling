export const POSITION_TRAFFIC_SHARE: { [key: number]: number } = {
  1: 0.30,
  2: 0.13,
  3: 0.09,
  4: 0.06,
  5: 0.04,
  6: 0.03,
  7: 0.023,
  8: 0.019,
  9: 0.019,
  10: 0.017,
  11: 0.013,
  12: 0.013,
  13: 0.013,
  14: 0.013,
  15: 0.013,
  16: 0.01,
  17: 0.01,
  18: 0.01,
  19: 0.01,
  20: 0.01,
  21: 0.002,
  22: 0.002,
  23: 0.002,
  24: 0.002,
  25: 0.002,
  26: 0.002,
  27: 0.002,
  28: 0.002,
  29: 0.002,
  30: 0.002
};

export function calculateTrafficShare(position: number): number {
  // Handle exact positions first
  if (Number.isInteger(position) && position <= 30) {
    return POSITION_TRAFFIC_SHARE[position] || 0;
  }

  // Handle positions after 30
  if (position > 30) {
    return 0;
  }

  // Interpolate between positions for decimal values
  const lowerPosition = Math.floor(position);
  const upperPosition = Math.ceil(position);
  const fraction = position - lowerPosition;

  const lowerShare = POSITION_TRAFFIC_SHARE[lowerPosition] || 0;
  const upperShare = POSITION_TRAFFIC_SHARE[upperPosition] || 0;

  // Linear interpolation between the two closest positions
  return lowerShare + (fraction * (upperShare - lowerShare));
}

// Optimized batch calculation
export function calculateTrafficShareBatch(positions: number[]): number[] {
  return positions.map(calculateTrafficShare);
}

// Calculate estimated traffic
export function calculateEstimatedTraffic(position: number, searchVolume: number): number {
  return Math.floor(searchVolume * calculateTrafficShare(position));
}

// Optimized batch calculation for estimated traffic
export function calculateEstimatedTrafficBatch(positions: number[], searchVolumes: number[]): number[] {
  const length = Math.min(positions.length, searchVolumes.length);
  const result = new Array(length);
  
  for (let i = 0; i < length; i++) {
    result[i] = calculateEstimatedTraffic(positions[i], searchVolumes[i]);
  }
  
  return result;
}

// Calculate average position
export function calculateAveragePosition(positions: number[]): number {
  if (!positions.length) return 0;
  
  const sum = positions.reduce((acc, pos) => acc + pos, 0);
  return sum / positions.length;
}