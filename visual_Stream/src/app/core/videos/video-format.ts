const compactNumber = new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 });
const relativeTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const TIME_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60]
];

export function formatCount(count: number): string {
  return compactNumber.format(count);
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

export function formatTimeAgo(createdAt: string, now: number = Date.now()): string {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  for (const [unit, seconds] of TIME_UNITS) {
    if (elapsedSeconds >= seconds) {
      return relativeTime.format(-Math.floor(elapsedSeconds / seconds), unit);
    }
  }
  return relativeTime.format(0, 'minute');
}
