import UppyObjectEmbedder from '../../modules/uppy-object-embedder';

export type ImageLabel = { text: string; confidence: number };

// An object detector's per-box scores run lower than a whole-image labeler's: a correctly detected
// fork/spoon/toothbrush routinely scores 0.25-0.4, so a 0.4 bar rejected real matches.
const CONFIDENCE_THRESHOLD = 0.25;

// A handful of the label vocabulary (MediaPipe's Object Detector -- COCO's 80 class names)
// doesn't exactly match our pool's names (e.g. "vehicle" is car/truck/bicycle/..., "couch" is
// often also called a sofa, COCO's table class is "dining table"). Matching is forgiving so a
// correct detection isn't rejected over wording.
const SYNONYMS: Record<string, string[]> = {
  backpack: ['backpack', 'bag', 'handbag', 'baggage', 'rucksack', 'knapsack'],
  spoon: ['spoon', 'cutlery', 'tableware', 'utensil'],
  refrigerator: ['refrigerator', 'fridge'],
  couch: ['couch', 'sofa'],
  // COCO's class is "dining table"; the pool item is shown as Dining Table.
  table: ['dining table', 'table'],
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
 * Random Object detection, on both platforms: MediaPipe's Object Detector (EfficientDet-Lite2, the
 * 80 COCO classes) via uppy-object-embedder, which is what the pool was designed against. Android
 * used to run @react-native-ml-kit/image-labeling instead, but that labeler's ~430-label
 * vocabulary has no label for most of the pool (toilet, microwave, scissors, fork, knife, spoon,
 * bowl, vase, hair dryer, toaster, toothbrush, ...), so those items could never match there. The
 * result is a flat {text, confidence} list of every detected object's top category.
 */
export async function labelImage(photoUri: string): Promise<ImageLabel[]> {
  return UppyObjectEmbedder.classifyImage(photoUri);
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
