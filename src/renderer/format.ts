const MINUTE = 60_000;

/** "just now", "5 min ago", "3 h ago", "yesterday", "12 days ago" or a date. */
export function timeAgo(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / MINUTE);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function clockTime(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
