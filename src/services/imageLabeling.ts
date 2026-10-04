import { Platform } from 'react-native';
import UppyObjectEmbedder from '../../modules/uppy-object-embedder';

export type ImageLabel = { text: string; confidence: number };

// ML Kit's labeler (Android) and an object detector's per-box scores (iOS) aren't on the same scale:
// a correctly detected fork/spoon/toothbrush routinely scores 0.25-0.4 on a detector, so the 0.4
// bar that suits whole-image labels rejected real matches on iOS.
const CONFIDENCE_THRESHOLD = Platform.OS === 'ios' ? 0.25 : 0.4;

// A handful of the label vocabulary (ML Kit on Android, MediaPipe's Object Detector on iOS)
// doesn't exactly match our pool's display names (e.g. "Bag" often reads as "Baggage" or
// "Handbag", COCO's own official class is spelled "hair drier" not "hair dryer"). This keeps the
// match forgiving without hardcoding every device's full label set, which varies.
const SYNONYMS: Record<string, string[]> = {
  backpack: ['backpack', 'bag', 'handbag', 'baggage', 'rucksack', 'knapsack'],
  spoon: ['spoon', 'cutlery', 'tableware', 'utensil'],
  bowl: ['bowl', 'tableware', 'dishware'],
  // COCO's own official 80-class label for this is spelled "hair drier", not "hair dryer" --
  // without it, iOS's Object Detector (which returns COCO class names verbatim) would never match
  // even a perfect, correctly-detected photo.
  hairdryer: ['hair dryer', 'hairdryer', 'hair drier', 'blow dryer'],
  refrigerator: ['refrigerator', 'fridge'],
  // "Vehicle" isn't itself a COCO class, but car/truck/bicycle/motorcycle each are — matching any
  // of them (rather than requiring the generic word "vehicle") covers what the detector actually
  // returns for a real photo.
  vehicle: ['vehicle', 'car', 'truck', 'bicycle', 'motorcycle', 'bike'],
};

function candidateNames(targetKey: string, targetLabel: string): string[] {
  const base = [targetKey.toLowerCase(), targetLabel.toLowerCase()];
  return [...base, ...(SYNONYMS[targetKey.toLowerCase()] ?? [])];
}

/**
 * Random Object detection. Android uses @react-native-ml-kit/image-labeling (base bundled ML Kit
 * model, ~400 broad categories). iOS uses MediaPipe's Object Detector instead (via
 * uppy-object-embedder, EfficientDet-Lite2, the 80 COCO classes) — ML Kit's iOS pod transitively
 * links GoogleToolboxForMac/GTMSessionFetcher, which collides at link time with the same symbols
 * MediaPipeTasksCommon's static graph library embeds for the Custom Object mission's Image
 * Embedder; react-native.config.js excludes ML Kit's iOS pod entirely to resolve it, so this is
 * the only way Random Object detection works on iOS.
 */
export async function labelImage(photoUri: string): Promise<ImageLabel[]> {
  if (Platform.OS === 'ios') {
    return UppyObjectEmbedder.classifyImage(photoUri);
  }
  const ImageLabeling = require('@react-native-ml-kit/image-labeling').default;
  return ImageLabeling.label(photoUri);
}

// Whole-word, not substring: "car" must not match COCO's "carrot", nor "pan" a "panda".
function containsWholeWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}($|[^a-z])`).test(haystack);
}

export function matchesTarget(labels: ImageLabel[], targetKey: string, targetLabel: string): boolean {
  const candidates = candidateNames(targetKey, targetLabel);
  return labels.some((label) => {
    if (label.confidence < CONFIDENCE_THRESHOLD) return false;
    const text = label.text.toLowerCase();
    return candidates.some((c) => containsWholeWord(text, c) || containsWholeWord(c, text));
  });
}
