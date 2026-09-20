import * as db from '../db/database';
import type { Alarm } from '../types/alarm';
import { cancelNativeAlarm, scheduleNativeAlarm } from './alarmScheduler';

export async function listAlarms(): Promise<Alarm[]> {
  return db.listAlarms();
}

export async function getAlarm(id: string): Promise<Alarm | null> {
  return db.getAlarm(id);
}

export async function saveAlarm(alarm: Alarm): Promise<void> {
  await db.saveAlarm(alarm);
  await scheduleNativeAlarm(alarm);
}

export async function deleteAlarm(id: string): Promise<void> {
  await db.deleteAlarm(id);
  await cancelNativeAlarm(id);
}

export async function setAlarmEnabled(alarm: Alarm, enabled: boolean): Promise<void> {
  await db.setAlarmEnabled(alarm.id, enabled);
  if (enabled) {
    await scheduleNativeAlarm({ ...alarm, enabled: true });
  } else {
    await cancelNativeAlarm(alarm.id);
  }
}
