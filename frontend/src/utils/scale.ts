// frontend/src/utils/scale.ts
// Utility functions for linear scaling and tick generation

/**
 * Creates a linear scale function mapping an input domain to an output range.
 * @param domain [d0, d1] input domain
 * @param range [r0, r1] output range
 * @returns a function value => scaledValue
 */
export function linearScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const m = (r1 - r0) / (d1 - d0);
  return (value: number) => r0 + (value - d0) * m;
}

/**
 * Generates "nice" tick values for a numeric domain.
 * @param domain [min, max]
 * @param count approximate number of ticks desired
 * @returns array of tick positions
 */
export function niceTicks(
  domain: [number, number],
  count: number
): number[] {
  let [min, max] = domain;
  if (min === max) {
    return [min];
  }

  const span = max - min;
  const rawStep = span / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let niceStep: number;

  if (residual >= 5) {
    niceStep = 10 * magnitude;
  } else if (residual >= 2) {
    niceStep = 5 * magnitude;
  } else if (residual >= 1) {
    niceStep = 2 * magnitude;
  } else {
    niceStep = magnitude;
  }

  // Find nice start and end
  const niceMin = niceStep * Math.floor(min / niceStep);
  const niceMax = niceStep * Math.ceil(max / niceStep);

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + 1e-6; v += niceStep) {
    ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
}
