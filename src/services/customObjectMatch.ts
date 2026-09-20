import UppyObjectEmbedder from '../../modules/uppy-object-embedder';
import type { CustomObject } from '../types/alarm';

const SIMILARITY_THRESHOLD = 0.7;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Embeds each reference photo captured in Custom Object setup, for storage on the alarm draft. */
export async function embedReferencePhotos(photoUris: string[]): Promise<number[][]> {
  return Promise.all(photoUris.map((uri) => UppyObjectEmbedder.embedImage(uri)));
}

/**
 * Embeds the live capture and compares it against every reference embedding via cosine
 * similarity, matching if any reference is a close enough match (accounts for the live photo
 * showing the object from a different angle than some of the 2-3 references).
 */
export async function matchesCustomObject(photoUri: string, customObject: CustomObject): Promise<boolean> {
  if (customObject.embeddings.length === 0) return false;
  const liveEmbedding = await UppyObjectEmbedder.embedImage(photoUri);
  return customObject.embeddings.some(
    (reference) => cosineSimilarity(liveEmbedding, reference) >= SIMILARITY_THRESHOLD
  );
}
