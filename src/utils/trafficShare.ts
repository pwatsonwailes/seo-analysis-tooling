const POSITION_TRAFFIC_SHARE: { [key: number]: number } = {
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
};

export function calculateTrafficShare(position: number): number {
  // Handle exact positions first
  if (Number.isInteger(position) && position <= 10) {
    return POSITION_TRAFFIC_SHARE[position] || 0;
  }

  // Handle positions after 10
  if (position > 10) {
    if (position <= 15) return 0.013;
    if (position <= 20) return 0.01;
    if (position <= 30) return 0.002;
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