import ImageLabeling, { type Label } from '@react-native-ml-kit/image-labeling';

const CONFIDENCE_THRESHOLD = 0.4;

// A handful of ML Kit's generic label vocabulary doesn't exactly match our pool's display names
// (e.g. it says "Furniture" for a couch, "Vehicle" never comes up but "Bag" often reads as
// "Baggage" or "Handbag"). This keeps the match forgiving without hardcoding every device's full
// label set, which the build brief explicitly warns will vary.
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

export async function labelImage(photoUri: string): Promise<Label[]> {
  return ImageLabeling.label(photoUri);
}

export function matchesTarget(labels: Label[], targetKey: string, targetLabel: string): boolean {
  const candidates = candidateNames(targetKey, targetLabel);
  return labels.some((label) => {
    if (label.confidence < CONFIDENCE_THRESHOLD) return false;
    const text = label.text.toLowerCase();
    return candidates.some((c) => text.includes(c) || c.includes(text));
  });
}
