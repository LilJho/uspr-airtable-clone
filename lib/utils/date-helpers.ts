export const isToday = (iso: string): boolean => {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

export const formatRelative = (dateIso?: string | null): string => {
  if (!dateIso) return "";
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export function formatInTimezone(dateIso: string | null | undefined, timezone: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      ...opts,
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}