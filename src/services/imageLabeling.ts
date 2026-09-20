import { Platform } from 'react-native';
import UppyObjectEmbedder from '../../modules/uppy-object-embedder';

export type ImageLabel = { text: string; confidence: number };

const CONFIDENCE_THRESHOLD = 0.4;

// A handful of the label vocabulary (ML Kit on Android, MediaPipe's Image Classifier on iOS)
// doesn't exactly match our pool's display names (e.g. it says "Furniture" for a couch, "Bag"
// often reads as "Baggage" or "Handbag"). This keeps the match forgiving without hardcoding every
// device's full label set, which the build brief explicitly warns will vary.
const SYNONYMS: Record<string, string[]> = {
  television: ['tv', 'television'],
  couch: ['couch', 'sofa', 'furniture'],
  bag: ['bag', 'baggage', 'handbag', 'luggage'],
  shelf: ['shelf', 'shelving', 'furniture'],
  countertop: ['countertop', 'counter'],
  lampshade: ['lampshade', 'lamp'],
};

function candidateNames(targetKey: string, targetLabel: string): string[] {
  const base = [targetKey.toLowerCase(), targetLabel.toLowerCase()];
  return [...base, ...(SYNONYMS[targetKey.toLowerCase()] ?? [])];
}

/**
 * Random Object detection. Android uses @react-native-ml-kit/image-labeling (base bundled ML Kit
 * model). iOS uses MediaPipe's Image Classifier instead (via uppy-object-embedder) — ML Kit's iOS
 * pod transitively links GoogleToolboxForMac/GTMSessionFetcher, which collides at link time with
 * the same symbols MediaPipeTasksCommon's static graph library embeds for the Custom Object
 * mission's Image Embedder; react-native.config.js excludes ML Kit's iOS pod entirely to resolve
 * it, so this is the only way Random Object detection works on iOS.
 */
export async function labelImage(photoUri: string): Promise<ImageLabel[]> {
  if (Platform.OS === 'ios') {
    return UppyObjectEmbedder.classifyImage(photoUri);
  }
  const ImageLabeling = require('@react-native-ml-kit/image-labeling').default;
  return ImageLabeling.label(photoUri);
}

export function matchesTarget(labels: ImageLabel[], targetKey: string, targetLabel: string): boolean {
  const candidates = candidateNames(targetKey, targetLabel);
  return labels.some((label) => {
    if (label.confidence < CONFIDENCE_THRESHOLD) return false;
    const text = label.text.toLowerCase();
    return candidates.some((c) => text.includes(c) || c.includes(text));
  });
}
