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
    const candidates =
      excludeKey && alarm.randomObjectPool.length > 1
        ? alarm.randomObjectPool.filter((k) => k !== excludeKey)
        : alarm.randomObjectPool;
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    const label = RANDOM_OBJECT_LABELS.find((o) => o.key === key)?.name ?? key;
    return { key, label };
  }
  return null;
}
