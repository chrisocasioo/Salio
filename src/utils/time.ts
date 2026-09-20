import * as Localization from 'expo-localization';

let cached24h: boolean | null = null;

export function uses24HourClock(): boolean {
  if (cached24h !== null) return cached24h;
  const calendars = Localization.getCalendars();
  // uses24hourClock may be null on some platforms; default to false (12h) then.
  cached24h = calendars.length > 0 && calendars[0].uses24hourClock != null ? calendars[0].uses24hourClock : false;
  return cached24h;
}

export function formatTimeParts(hour: number, minute: number): { main: string; ampm: string | null } {
  const mm = minute.toString().padStart(2, '0');
  if (uses24HourClock()) {
    return { main: `${hour.toString().padStart(2, '0')}:${mm}`, ampm: null };
  }
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return { main: `${h12}:${mm}`, ampm };
}

export function to12Hour(hour: number): { hour12: number; ampm: 'AM' | 'PM' } {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour12: h12, ampm: hour < 12 ? 'AM' : 'PM' };
}

export function from12Hour(hour12: number, ampm: 'AM' | 'PM'): number {
  const base = hour12 % 12;
  return ampm === 'AM' ? base : base + 12;
}
