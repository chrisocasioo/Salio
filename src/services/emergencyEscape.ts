import { getEmergencyEscapeState, saveEmergencyEscapeState } from '../db/database';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const BASE_TAPS = 100;
const STEP_TAPS = 100;

/** How many taps this Emergency Escape attempt needs, applying the 30-day reset. */
export async function getRequiredTaps(): Promise<number> {
  const state = await getEmergencyEscapeState();
  if (state.lastUsedAt === null) return BASE_TAPS;
  const elapsed = Date.now() - state.lastUsedAt;
  return elapsed > THIRTY_DAYS_MS ? BASE_TAPS : state.requiredTaps;
}

/** Records a completed escape: next use (within 30 days) needs `usedTaps + 100`. */
export async function recordEscapeUsed(usedTaps: number): Promise<void> {
  await saveEmergencyEscapeState({ requiredTaps: usedTaps + STEP_TAPS, lastUsedAt: Date.now() });
}
