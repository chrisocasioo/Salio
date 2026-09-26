import { Platform } from 'react-native';
import UppyObjectEmbedder from '../../modules/uppy-object-embedder';

export type ImageLabel = { text: string; confidence: number };

const CONFIDENCE_THRESHOLD = 0.4;

// A handful of the label vocabulary (ML Kit on Android, MediaPipe's Object Detector on iOS)
// doesn't exactly match our pool's display names (e.g. "Bag" often reads as "Baggage" or
// "Handbag", COCO's own official class is spelled "hair drier" not "hair dryer"). This keeps the
// match forgiving without hardcoding every device's full label set, which varies.
const SYNONYMS: Record<string, string[]> = {
  backpack: ['backpack', 'bag', 'rucksack', 'knapsack'],
  spoon: ['spoon', 'cutlery', 'tableware', 'utensil'],
  bowl: ['bowl', 'tableware', 'dishware'],
  // COCO's own official 80-class label for this is spelled "hair drier", not "hair dryer" --
  // without it, iOS's Object Detector (which returns COCO class names verbatim) would never match
  // even a perfect, correctly-detected photo.
  hairdryer: ['hair dryer', 'hairdryer', 'hair drier', 'blow dryer'],
  // Some models return fine-grained footwear subtypes instead of a generic "shoe" label — none of
  // these substring-match "shoe" on their own, so without this the match would silently fail on a
  // correct photo of anything other than a plain sneaker. NOTE: "shoe" isn't a COCO class at all
  // (confirmed against COCO's official 80-class list), so none of this can help on iOS's Object
  // Detector -- only Android's broader ~400-category ML Kit labeler can realistically match this
  // item at all. See the random-object-pool conversation for whether to keep/replace it.
  shoe: ['shoe', 'sneaker', 'sandal', 'boot', 'slipper', 'loafer', 'flip-flop', 'flip flop', 'heel', 'footwear'],
  // "Frying pan" isn't one of COCO's 80 classes, and iOS's Object Detector can only ever output one
  // of those 80 exact names -- no synonym here can make it match there. These synonyms only help
  // Android's ML Kit labeler (broader ~400-category vocabulary), which does return general cookware
  // terms like these for a pan.
  pan: ['pan', 'frying pan', 'frypan', 'fry pan', 'skillet', 'saucepan', 'cookware', 'wok'],
  // Same "not a COCO class" caveat as pan above -- iOS's Object Detector can't match this at all;
  // these synonyms only help Android's broader ML Kit vocabulary.
  coffeemaker: [
    'coffee maker',
    'coffeemaker',
    'coffee machine',
    'espresso machine',
    'espresso maker',
    'coffeepot',
    'percolator',
  ],
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
 * uppy-object-embedder, EfficientDet-Lite0, the 80 COCO classes) — ML Kit's iOS pod transitively
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

export function matchesTarget(labels: ImageLabel[], targetKey: string, targetLabel: string): boolean {
  const candidates = candidateNames(targetKey, targetLabel);
  return labels.some((label) => {
    if (label.confidence < CONFIDENCE_THRESHOLD) return false;
    const text = label.text.toLowerCase();
    return candidates.some((c) => text.includes(c) || c.includes(text));
  });
}
