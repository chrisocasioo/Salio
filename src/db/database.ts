import * as SQLite from 'expo-sqlite';
import type { Alarm, CustomObject, DayOfWeek, DismissMission, EmergencyEscapeState, Repeat } from '../types/alarm';

const DB_NAME = 'uppy.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS alarms (
          id TEXT PRIMARY KEY NOT NULL,
          hour INTEGER NOT NULL,
          minute INTEGER NOT NULL,
          label TEXT NOT NULL DEFAULT '',
          repeatOnce INTEGER NOT NULL DEFAULT 1,
          repeatDays TEXT NOT NULL DEFAULT '[]',
          enabled INTEGER NOT NULL DEFAULT 1,
          androidSoundUri TEXT,
          dismissMission TEXT NOT NULL DEFAULT 'none',
          randomObjectPool TEXT NOT NULL DEFAULT '[]',
          customObjectName TEXT,
          customObjectEmbeddings TEXT,
          sortOrder INTEGER NOT NULL DEFAULT 0
        );
      `);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS emergency_escape (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          requiredTaps INTEGER NOT NULL DEFAULT 100,
          lastUsedAt INTEGER
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

type AlarmRow = {
  id: string;
  hour: number;
  minute: number;
  label: string;
  repeatOnce: number;
  repeatDays: string;
  enabled: number;
  androidSoundUri: string | null;
  dismissMission: string;
  randomObjectPool: string;
  customObjectName: string | null;
  customObjectEmbeddings: string | null;
  sortOrder: number;
};

function rowToAlarm(row: AlarmRow): Alarm {
  const repeat: Repeat = row.repeatOnce
    ? 'once'
    : { days: new Set(JSON.parse(row.repeatDays) as DayOfWeek[]) };
  const customObject: CustomObject | null = row.customObjectName
    ? {
        name: row.customObjectName,
        embeddings: row.customObjectEmbeddings ? JSON.parse(row.customObjectEmbeddings) : [],
      }
    : null;
  return {
    id: row.id,
    hour: row.hour,
    minute: row.minute,
    label: row.label,
    repeat,
    enabled: !!row.enabled,
    androidSoundUri: row.androidSoundUri,
    dismissMission: row.dismissMission as DismissMission,
    randomObjectPool: JSON.parse(row.randomObjectPool),
    customObject,
  };
}

export async function listAlarms(): Promise<Alarm[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AlarmRow>(
    'SELECT * FROM alarms ORDER BY sortOrder ASC, hour ASC, minute ASC;'
  );
  return rows.map(rowToAlarm);
}

export async function getAlarm(id: string): Promise<Alarm | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AlarmRow>('SELECT * FROM alarms WHERE id = ?;', [id]);
  return row ? rowToAlarm(row) : null;
}

export async function saveAlarm(alarm: Alarm): Promise<void> {
  const db = await getDb();
  const repeatOnce = alarm.repeat === 'once' ? 1 : 0;
  const repeatDays = alarm.repeat === 'once' ? '[]' : JSON.stringify(Array.from(alarm.repeat.days));
  const existing = await db.getFirstAsync<{ sortOrder: number }>(
    'SELECT sortOrder FROM alarms WHERE id = ?;',
    [alarm.id]
  );
  let sortOrder = existing?.sortOrder;
  if (sortOrder === undefined) {
    const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sortOrder) as m FROM alarms;');
    sortOrder = (max?.m ?? -1) + 1;
  }
  await db.runAsync(
    `INSERT INTO alarms (id, hour, minute, label, repeatOnce, repeatDays, enabled, androidSoundUri, dismissMission, randomObjectPool, customObjectName, customObjectEmbeddings, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       hour=excluded.hour, minute=excluded.minute, label=excluded.label,
       repeatOnce=excluded.repeatOnce, repeatDays=excluded.repeatDays, enabled=excluded.enabled,
       androidSoundUri=excluded.androidSoundUri, dismissMission=excluded.dismissMission,
       randomObjectPool=excluded.randomObjectPool, customObjectName=excluded.customObjectName,
       customObjectEmbeddings=excluded.customObjectEmbeddings;`,
    [
      alarm.id,
      alarm.hour,
      alarm.minute,
      alarm.label,
      repeatOnce,
      repeatDays,
      alarm.enabled ? 1 : 0,
      alarm.androidSoundUri,
      alarm.dismissMission,
      JSON.stringify(alarm.randomObjectPool),
      alarm.customObject?.name ?? null,
      alarm.customObject ? JSON.stringify(alarm.customObject.embeddings) : null,
      sortOrder,
    ]
  );
}

export async function deleteAlarm(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM alarms WHERE id = ?;', [id]);
}

export async function setAlarmEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE alarms SET enabled = ? WHERE id = ?;', [enabled ? 1 : 0, id]);
}

export async function getEmergencyEscapeState(): Promise<EmergencyEscapeState> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ requiredTaps: number; lastUsedAt: number | null }>(
    'SELECT requiredTaps, lastUsedAt FROM emergency_escape WHERE id = 1;'
  );
  if (!row) return { requiredTaps: 100, lastUsedAt: null };
  return { requiredTaps: row.requiredTaps, lastUsedAt: row.lastUsedAt };
}

export async function saveEmergencyEscapeState(state: EmergencyEscapeState): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO emergency_escape (id, requiredTaps, lastUsedAt) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET requiredTaps=excluded.requiredTaps, lastUsedAt=excluded.lastUsedAt;`,
    [state.requiredTaps, state.lastUsedAt]
  );
}
