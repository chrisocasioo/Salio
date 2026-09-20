import * as db from '../db/database';
import type { Alarm } from '../types/alarm';
import { cancelNativeAlarm, scheduleNativeAlarm } from './alarmScheduler';

export async function listAlarms(): Promise<Alarm[]> {
  return db.listAlarms();
}

export async function getAlarm(id: string): Promise<Alarm | null> {
  return db.getAlarm(id);
}

// Native scheduling calls into AlarmKit/AlarmManager for the first time on a given device or
// alarm shape, and can fail for reasons entirely outside the user's control here (authorization
// not finished settling, an OS quirk, ...). None of that should ever block saving/deleting the
// alarm itself, which is local-only and should always succeed — so these never throw. But a real
// scheduling failure (denied authorization, AlarmKit's own scheduled-alarm limit, ...) means the
// alarm was saved but will never actually ring, which the caller needs to be able to tell the user
// about rather than have it only logged — so the caller's error message (already a specific,
// user-facing string via UppyAlarmKitError's LocalizedError conformance on iOS) is returned instead
// of swallowed.
async function scheduleNativeAlarmSafely(alarm: Alarm): Promise<string | undefined> {
  try {
    await scheduleNativeAlarm(alarm);
    return undefined;
  } catch (error) {
    console.warn('Failed to schedule native alarm', alarm.id, error);
    return error instanceof Error ? error.message : String(error);
  }
}

async function cancelNativeAlarmSafely(id: string): Promise<void> {
  try {
    await cancelNativeAlarm(id);
  } catch (error) {
    console.warn('Failed to cancel native alarm', id, error);
  }
}

export async function saveAlarm(alarm: Alarm): Promise<string | undefined> {
  await db.saveAlarm(alarm);
  if (!alarm.enabled) return undefined;
  return scheduleNativeAlarmSafely(alarm);
}

export async function deleteAlarm(id: string): Promise<void> {
  await db.deleteAlarm(id);
  await cancelNativeAlarmSafely(id);
}

export async function setAlarmEnabled(alarm: Alarm, enabled: boolean): Promise<string | undefined> {
  await db.setAlarmEnabled(alarm.id, enabled);
  if (enabled) {
    return scheduleNativeAlarmSafely({ ...alarm, enabled: true });
  }
  await cancelNativeAlarmSafely(alarm.id);
  return undefined;
}
