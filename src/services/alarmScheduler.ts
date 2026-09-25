import { PermissionsAndroid, Platform } from 'react-native';
import type { Alarm } from '../types/alarm';

// Both native modules are optional at import time: on a platform that doesn't build them in
// (e.g. Android module on iOS) the require simply won't resolve, so guard every access.
let AlarmKit: typeof import('../../modules/uppy-alarm-kit').default | null = null;
let AlarmAndroid: typeof import('../../modules/uppy-alarm-android').default | null = null;

if (Platform.OS === 'ios') {
  try {
    AlarmKit = require('../../modules/uppy-alarm-kit').default;
  } catch {
    AlarmKit = null;
  }
} else if (Platform.OS === 'android') {
  try {
    AlarmAndroid = require('../../modules/uppy-alarm-android').default;
  } catch {
    AlarmAndroid = null;
  }
}

function daysArray(alarm: Alarm): number[] {
  return alarm.repeat === 'once' ? [] : Array.from(alarm.repeat.days);
}

function isRepeatOnce(alarm: Alarm): boolean {
  return alarm.repeat === 'once';
}

/** iOS: requests notification permission so the ringing alert's lock-screen banner can show. */
export async function requestAlarmPermissions(): Promise<void> {
  if (Platform.OS === 'ios' && AlarmKit) {
    await AlarmKit.requestAuthorization();
  }
  if (Platform.OS === 'android' && AlarmAndroid) {
    if (!AlarmAndroid.canScheduleExactAlarms()) {
      AlarmAndroid.openExactAlarmSettings();
    }
  }
}

export async function scheduleNativeAlarm(alarm: Alarm): Promise<void> {
  if (!alarm.enabled) {
    await cancelNativeAlarm(alarm.id);
    return;
  }
  if (Platform.OS === 'ios' && AlarmKit) {
    await AlarmKit.scheduleAlarm(
      alarm.id,
      alarm.hour,
      alarm.minute,
      isRepeatOnce(alarm),
      daysArray(alarm),
      alarm.label,
      alarm.dismissMission !== 'none'
    );
  } else if (Platform.OS === 'android' && AlarmAndroid) {
    AlarmAndroid.scheduleAlarm(
      alarm.id,
      alarm.hour,
      alarm.minute,
      isRepeatOnce(alarm),
      daysArray(alarm),
      alarm.label,
      alarm.androidSoundUri,
      alarm.dismissMission !== 'none'
    );
  }
}

export async function cancelNativeAlarm(id: string): Promise<void> {
  if (Platform.OS === 'ios' && AlarmKit) {
    try {
      AlarmKit.cancelAlarm(id);
    } catch {
      // Alarm may already be gone (fired and not repeating, or never successfully scheduled).
    }
  } else if (Platform.OS === 'android' && AlarmAndroid) {
    AlarmAndroid.cancelAlarm(id);
  }
}

/** Stops the ringing service/notification (Android) or the ringing sound/keep-alive loop (iOS). */
export function dismissRingingAlarm(id: string): void {
  if (Platform.OS === 'android' && AlarmAndroid) {
    AlarmAndroid.dismissAlarm(id);
  } else if (Platform.OS === 'ios' && AlarmKit) {
    AlarmKit.stopRinging(id).catch((error) => {
      console.warn('Failed to stop ringing alarm', id, error);
    });
  }
}

/** iOS only: set when the ringing notification opened the app; null otherwise. */
export function getPendingRingingAlarmId(): string | null {
  if (Platform.OS !== 'ios' || !AlarmKit) return null;
  return AlarmKit.getPendingRingingAlarmId();
}

/**
 * iOS only: fires the moment a ringing alarm's notification or AlarmKit alert is tapped, so the
 * ringing screen can appear even when the app was already in the foreground -- the AppState
 * 'active' transition App.tsx also listens for never happens in that case (there's no
 * background-to-active edge to catch), so polling getPendingRingingAlarmId() there alone would
 * silently miss it. Returns a no-op unsubscribe function on other platforms/when unavailable.
 */
export function addPendingRingingAlarmListener(callback: (alarmId: string) => void): () => void {
  if (Platform.OS !== 'ios' || !AlarmKit) return () => {};
  const subscription = AlarmKit.addListener('onAlarmTapped', ({ alarmId }) => callback(alarmId));
  return () => subscription.remove();
}

export function clearPendingRingingAlarmId(): void {
  AlarmKit?.clearPendingRingingAlarmId();
}

/** Android 13+ requires this runtime permission for RingingService's foreground notification. */
export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export function canScheduleExactAlarms(): boolean {
  if (Platform.OS !== 'android' || !AlarmAndroid) return true;
  return AlarmAndroid.canScheduleExactAlarms();
}

export function openExactAlarmSettings(): void {
  AlarmAndroid?.openExactAlarmSettings();
}

export function isIgnoringBatteryOptimizations(): boolean {
  if (Platform.OS !== 'android' || !AlarmAndroid) return true;
  return AlarmAndroid.isIgnoringBatteryOptimizations();
}

export function requestIgnoreBatteryOptimizations(): void {
  AlarmAndroid?.requestIgnoreBatteryOptimizations();
}
