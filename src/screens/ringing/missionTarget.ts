import { RANDOM_OBJECT_LABELS } from '../RandomObjectSetupScreen';
import type { Alarm } from '../../types/alarm';

/**
 * Picks what the mission asks the person to find, and the ring-time key MissionCapture (Stage 4)
 * will need to check the photo against. Random Object picks one enabled pool item at random each
 * time the alarm rings, matching "we'll pick one at random when this alarm rings" in the pool
 * picker's own copy.
 */
export function pickMissionTarget(alarm: Alarm): { key: string; label: string } | null {
  if (alarm.dismissMission === 'custom_object' && alarm.customObject) {
    return { key: 'custom_object', label: alarm.customObject.name };
  }
  if (alarm.dismissMission === 'random_object' && alarm.randomObjectPool.length > 0) {
    const key = alarm.randomObjectPool[Math.floor(Math.random() * alarm.randomObjectPool.length)];
    const label = RANDOM_OBJECT_LABELS.find((o) => o.key === key)?.name ?? key;
    return { key, label };
  }
  return null;
}
