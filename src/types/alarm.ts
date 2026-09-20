import { t } from '../i18n';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type Repeat = 'once' | { days: Set<DayOfWeek> };

export type DismissMission = 'none' | 'random_object' | 'custom_object';

export type CustomObject = {
  name: string;
  embeddings: number[][]; // 2-3 reference embeddings
};

export type Alarm = {
  id: string;
  hour: number; // 0-23, stored 24h internally regardless of display format
  minute: number;
  label: string;
  repeat: Repeat;
  enabled: boolean;
  androidSoundUri: string | null; // Android only; ignored on iOS
  dismissMission: DismissMission;
  randomObjectPool: string[]; // ML Kit label keys enabled for this alarm
  customObject: CustomObject | null;
};

export type EmergencyEscapeState = {
  requiredTaps: number; // starts at 100, +100 each time it's used
  lastUsedAt: number | null; // epoch ms; if now - lastUsedAt > 30 days, reset requiredTaps to 100
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: t('days.sun'),
  1: t('days.mon'),
  2: t('days.tue'),
  3: t('days.wed'),
  4: t('days.thu'),
  5: t('days.fri'),
  6: t('days.sat'),
};

export function createBlankAlarm(): Alarm {
  const now = new Date();
  return {
    id: '',
    hour: now.getHours(),
    minute: Math.ceil(now.getMinutes() / 5) * 5 % 60,
    label: '',
    repeat: 'once',
    enabled: true,
    androidSoundUri: null,
    dismissMission: 'none',
    randomObjectPool: [],
    customObject: null,
  };
}

export function repeatSummary(repeat: Repeat): string {
  if (repeat === 'once') return t('repeat.once');
  const days = repeat.days;
  if (days.size === 0) return t('repeat.once');
  if (days.size === 7) return t('repeat.everyDay');
  const weekdays: DayOfWeek[] = [1, 2, 3, 4, 5];
  const weekend: DayOfWeek[] = [0, 6];
  if (weekdays.every((d) => days.has(d)) && days.size === 5) return t('repeat.weekdays');
  if (weekend.every((d) => days.has(d)) && days.size === 2) return t('repeat.weekend');
  const order: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
  return order
    .filter((d) => days.has(d))
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

export function missionLabel(mission: DismissMission): string {
  switch (mission) {
    case 'random_object':
      return t('mission.randomObject');
    case 'custom_object':
      return t('mission.customObject');
    default:
      return t('mission.none');
  }
}
