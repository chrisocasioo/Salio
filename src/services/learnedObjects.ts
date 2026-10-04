import UppyObjectEmbedder from '../../modules/uppy-object-embedder';
import { addLearnedEmbedding, clearLearnedEmbeddings, listLearnedEmbeddings } from '../db/database';
import { cosineSimilarity } from './customObjectMatch';

/**
 * Lets the Random Object scanner get better at the items in the person's own home. Whenever the
 * detector confidently confirms a scan, that photo's embedding (a 1024-number fingerprint, never
 * the photo itself) is kept against the item that was asked for. On later scans the detector
 * failing to be sure isn't the end: a live frame that closely resembles a previously confirmed
 * one is accepted too.
 *
 * Only detector-confirmed scans are ever learned from -- never ones accepted via this file -- so
 * the stored set can't drift or be poisoned by its own past mistakes.
 *
 * The similarity bands below were measured with the bundled MobileNetV3 embedder: unrelated photos
 * scored 0.19 on average and never above 0.70; a lightly reframed shot of the same scene scored a
 * median 0.88 (5th percentile 0.75); heavier reframing fell off fast. Same-room-different-object
 * pairs weren't measurable offline, so the lower band is only trusted when the detector also saw
 * a hint of the target.
 */

export const MAX_LEARNED_PER_ITEM = 50;

/** A detector match must be this confident before its photo is learned from. */
export const LEARN_MIN_DETECTOR_CONFIDENCE = 0.5;
/** Near-identical to an already-stored embedding: skip it so the 50 slots stay varied. */
const DUPLICATE_SIMILARITY = 0.95;
/** Close enough to a past confirmed scan to accept on its own. */
const STRONG_SIMILARITY = 0.85;
/** Looser, only accepted when the detector also gave the target at least a weak signal. */
const SUPPORTED_SIMILARITY = 0.75;
export const WEAK_DETECTOR_SIGNAL = 0.1;

export async function loadLearnedEmbeddings(objectKey: string): Promise<number[][]> {
  try {
    return await listLearnedEmbeddings(objectKey);
  } catch (error) {
    console.warn('Could not load learned embeddings', error);
    return [];
  }
}

function round(embedding: number[]): number[] {
  return embedding.map((v) => Math.round(v * 10000) / 10000);
}

/** Never throws: learning is a bonus and must not get in the way of dismissing the alarm. */
export async function learnFromConfirmedScan(photoUri: string, objectKey: string): Promise<void> {
  try {
    const embedding = await UppyObjectEmbedder.embedImage(photoUri);
    const existing = await listLearnedEmbeddings(objectKey);
    if (existing.some((e) => cosineSimilarity(embedding, e) >= DUPLICATE_SIMILARITY)) return;
    await addLearnedEmbedding(objectKey, round(embedding), MAX_LEARNED_PER_ITEM);
  } catch (error) {
    console.warn('Could not learn from scan', error);
  }
}

export async function matchesLearnedObject(
  photoUri: string,
  learned: number[][],
  detectorSawTarget: boolean
): Promise<boolean> {
  if (learned.length === 0) return false;
  const live = await UppyObjectEmbedder.embedImage(photoUri);
  let best = 0;
  for (const reference of learned) best = Math.max(best, cosineSimilarity(live, reference));
  return best >= STRONG_SIMILARITY || (detectorSawTarget && best >= SUPPORTED_SIMILARITY);
}

export async function resetLearnedObjects(): Promise<void> {
  await clearLearnedEmbeddings();
}
