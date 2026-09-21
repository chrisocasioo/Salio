import { Platform } from 'react-native';
import UppyObjectEmbedder from '../../modules/uppy-object-embedder';

export type ImageLabel = { text: string; confidence: number };

const CONFIDENCE_THRESHOLD = 0.4;

// A handful of the label vocabulary (ML Kit on Android, MediaPipe's Image Classifier on iOS)
// doesn't exactly match our pool's display names (e.g. "Bag" often reads as "Baggage" or
// "Handbag", "Hair Dryer" as a two-word label doesn't substring-match the single-word key). This
// keeps the match forgiving without hardcoding every device's full label set, which varies.
const SYNONYMS: Record<string, string[]> = {
  mug: ['mug', 'cup', 'coffee cup', 'drinkware'],
  backpack: ['backpack', 'bag', 'rucksack', 'knapsack'],
  spoon: ['spoon', 'cutlery', 'tableware', 'utensil'],
  bowl: ['bowl', 'tableware', 'dishware'],
  hairdryer: ['hair dryer', 'hairdryer', 'blow dryer'],
  // Some models return fine-grained footwear subtypes instead of a generic "shoe" label — none of
  // these substring-match "shoe" on their own, so without this the match would silently fail on a
  // correct photo of anything other than a plain sneaker.
  shoe: ['shoe', 'sneaker', 'sandal', 'boot', 'slipper', 'loafer', 'flip-flop', 'flip flop', 'heel', 'footwear'],
  // "Frying pan" isn't one of COCO's 80 classes the way most of this pool is, so this leans harder
  // on synonyms than usual: it's a real ImageNet class (likely what the iOS classifier draws on)
  // and shows up in ML Kit's broader label set as general cookware terms, but which exact word
  // either model returns is less predictable than for the COCO-backed items.
  pan: ['pan', 'frying pan', 'frypan', 'fry pan', 'skillet', 'saucepan', 'cookware', 'wok'],
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
