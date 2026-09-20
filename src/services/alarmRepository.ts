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
// alarm itself, which is local-only and should always succeed — so these are best-effort: log and
// move on rather than letting the caller's whole save/delete hang on an unhandled rejection.
async function scheduleNativeAlarmSafely(alarm: Alarm): Promise<void> {
  try {
    await scheduleNativeAlarm(alarm);
  } catch (error) {
    console.warn('Failed to schedule native alarm', alarm.id, error);
  }
}

async function cancelNativeAlarmSafely(id: string): Promise<void> {
  try {
    await cancelNativeAlarm(id);
  } catch (error) {
    console.warn('Failed to cancel native alarm', id, error);
  }
}

export async function saveAlarm(alarm: Alarm): Promise<void> {
  await db.saveAlarm(alarm);
  await scheduleNativeAlarmSafely(alarm);
}

export async function deleteAlarm(id: string): Promise<void> {
  await db.deleteAlarm(id);
  await cancelNativeAlarmSafely(id);
}

export async function setAlarmEnabled(alarm: Alarm, enabled: boolean): Promise<void> {
  await db.setAlarmEnabled(alarm.id, enabled);
  if (enabled) {
    await scheduleNativeAlarmSafely({ ...alarm, enabled: true });
  } else {
    await cancelNativeAlarmSafely(alarm.id);
  }
}
