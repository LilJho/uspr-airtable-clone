import { useEffect, useState } from 'react';

const STORAGE_KEY = 'app.timezone';
const EVENT_NAME = 'app:timezone-changed';

export function readStoredTimezone(): string {
  if (typeof window === 'undefined') return 'America/New_York';
  return localStorage.getItem(STORAGE_KEY) || 'America/New_York';
}

export function writeStoredTimezone(timezone: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, timezone);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { timezone } }));
}

export function useTimezone(): { timezone: string } {
  const [timezone, setTimezone] = useState<string>(() => readStoredTimezone());

  useEffect(() => {
    const handler = (e: Event) => {
      const tz = (e as CustomEvent).detail?.timezone as string | undefined;
      if (tz) setTimezone(tz);
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  return { timezone };
}


