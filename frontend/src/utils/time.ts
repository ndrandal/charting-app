// frontend/src/utils/time.ts

export type TimeUnitType = 'month' | 'day' | 'hour' | 'minute' | 'second';

export interface TimeUnit {
  unit: TimeUnitType;
  step: number;
}

/**
 * Choose a time unit and step based on the total span in milliseconds.
 */
export function determineTimeUnit(spanMs: number): TimeUnit {
  const ms = spanMs;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day; // approximate

  if (ms >= month * 6) {
    return { unit: 'month', step: 1 };
  } else if (ms >= week) {
    return { unit: 'day', step: 1 };
  } else if (ms >= day) {
    return { unit: 'hour', step: 6 };
  } else if (ms >= hour) {
    return { unit: 'hour', step: 1 };
  } else if (ms >= 10 * minute) {
    return { unit: 'minute', step: 10 };
  } else if (ms >= minute) {
    return { unit: 'minute', step: 1 };
  } else if (ms >= 10 * 1000) {
    return { unit: 'second', step: 10 };
  } else {
    return { unit: 'second', step: 1 };
  }
}

/**
 * Generate tick positions (timestamps) snapped to natural boundaries.
 */
export function generateTimeTicks(
  domain: [number, number],
  { unit, step }: TimeUnit
): number[] {
  const [start, end] = domain;
  const ticks: number[] = [];
  let d = new Date(start);

  // snap down to unit boundary
  switch (unit) {
    case 'month':
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      break;
    case 'day':
      d.setUTCHours(0, 0, 0, 0);
      break;
    case 'hour':
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(Math.floor(d.getUTCHours() / step) * step);
      break;
    case 'minute':
      d.setUTCSeconds(0, 0);
      d.setUTCMinutes(Math.floor(d.getUTCMinutes() / step) * step);
      break;
    case 'second':
      d.setUTCMilliseconds(0);
      d.setUTCSeconds(Math.floor(d.getUTCSeconds() / step) * step);
      break;
  }

  // generate ticks
  while (d.getTime() <= end) {
    ticks.push(d.getTime());
    switch (unit) {
      case 'month':
        d.setUTCMonth(d.getUTCMonth() + step);
        break;
      case 'day':
        d.setUTCDate(d.getUTCDate() + step);
        break;
      case 'hour':
        d.setUTCHours(d.getUTCHours() + step);
        break;
      case 'minute':
        d.setUTCMinutes(d.getUTCMinutes() + step);
        break;
      case 'second':
        d.setUTCSeconds(d.getUTCSeconds() + step);
        break;
    }
  }
  return ticks;
}

/**
 * Format a timestamp according to the time unit.
 */
export function formatTimeTick(
  ts: number,
  { unit }: TimeUnit
): string {
  const d = new Date(ts);
  switch (unit) {
    case 'month':
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    case 'day':
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    case 'hour':
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    case 'minute':
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    case 'second':
      return d.toLocaleTimeString(undefined, { minute: '2-digit', second: '2-digit' });
    default:
      return d.toString();
  }
}
