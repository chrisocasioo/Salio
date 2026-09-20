import type { CustomObject } from '../types/alarm';

/**
 * Stage 5 TODO: replace with the real MediaPipe Image Embedder cosine-similarity check against
 * `customObject.embeddings` (the reference photos captured in Custom Object setup). Until the
 * native embedder module exists, a Custom Object mission accepts any photo so the ringing ->
 * mission -> dismiss flow built in Stage 2/4 is fully testable end to end.
 */
export async function matchesCustomObject(_photoUri: string, _customObject: CustomObject): Promise<boolean> {
  return true;
}
