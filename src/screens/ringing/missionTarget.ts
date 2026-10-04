import { RANDOM_OBJECT_LABELS } from '../RandomObjectSetupScreen';
import type { Alarm } from '../../types/alarm';

/**
 * Picks what the mission asks the person to find, and the ring-time key MissionCapture (Stage 4)
 * will need to check the photo against. Random Object picks one enabled pool item at random each
 * time the alarm rings, matching "we'll pick one at random when this alarm rings" in the pool
 * picker's own copy.
 *
 * `excludeKey` is used for re-rolling (AlarmRingingMissionScreen's "Try a different object"): when
 * the pool has another option, the new pick is guaranteed to differ from the one being replaced.
 */
export function pickMissionTarget(alarm: Alarm, excludeKey?: string): { key: string; label: string } | null {
  if (alarm.dismissMission === 'custom_object' && alarm.customObject) {
    return { key: 'custom_object', label: alarm.customObject.name };
  }
  if (alarm.dismissMission === 'random_object' && alarm.randomObjectPool.length > 0) {
    // Alarms saved before a pool item was retired can still carry its old key; asking for an item
    // that can no longer be matched would leave the mission impossible, so drop unknown keys (and
    // fall back to the whole pool if that leaves nothing).
    const known = new Set(RANDOM_OBJECT_LABELS.map((o) => o.key));
    const valid = alarm.randomObjectPool.filter((k) => known.has(k));
    const pool = valid.length > 0 ? valid : RANDOM_OBJECT_LABELS.map((o) => o.key);
    const candidates = excludeKey && pool.length > 1 ? pool.filter((k) => k !== excludeKey) : pool;
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    const label = RANDOM_OBJECT_LABELS.find((o) => o.key === key)?.name ?? key;
    return { key, label };
  }
  return null;
}
