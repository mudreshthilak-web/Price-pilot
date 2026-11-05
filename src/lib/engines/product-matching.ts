import { Listing, MatchedGroup, ListingWithMatch } from '../types';
import { SCORING_CONFIG } from './scoring.config';

/**
 * Standardize text: lowercases, removes non-alphanumeric punctuation (keeping unit chars),
 * and normalizes spaces.
 */
export function cleanTitle(title: string): string {
  let cleaned = title.toLowerCase();

  // Normalize units
  cleaned = cleaned.replace(/\b(\d+)\s*(gb|tb|mb)\b/g, '$1$2');
  cleaned = cleaned.replace(/\b(\d+)\s*(inch|in|"|'|cm)\b/g, '$1inch');
  cleaned = cleaned.replace(/\b(\d+)\s*(w|watt|watts)\b/g, '$1w');

  // Strip punctuation except spaces and alphanumeric
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');

  // Remove marketing words
  const words = cleaned.split(/\s+/).filter(Boolean);
  const filtered = words.filter(
    (w) => !SCORING_CONFIG.matching.marketingWords.includes(w)
  );

  return filtered.join(' ').trim();
}

/**
 * Extract brand, model, and variant characteristics from title & listing
 */
export function extractAttributes(listing: { title: string; brand?: string; modelNumber?: string; variant?: string }): {
  brand: string;
  modelNumber: string;
  variant: string;
} {
  const brand = (listing.brand || '').trim().toLowerCase();
  const modelNumber = (listing.modelNumber || '').trim().toLowerCase();
  const variant = (listing.variant || '').trim().toLowerCase();

  return { brand, modelNumber, variant };
}

/**
 * Tokenize string into word frequency map
 */
function getTermFrequencies(text: string): Map<string, number> {
  const tf = new Map<string, number>();
  const tokens = cleanTitle(text).split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

/**
 * Compute TF-IDF Cosine Similarity between two text strings
 */
export function computeSimilarity(a: string, b: string): number {
  const tfA = getTermFrequencies(a);
  const tfB = getTermFrequencies(b);

  if (tfA.size === 0 || tfB.size === 0) return 0;

  // Build vocabulary
  const vocab = new Set([...tfA.keys(), ...tfB.keys()]);

  // Document frequencies (across these 2 docs)
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term of vocab) {
    const countA = tfA.get(term) || 0;
    const countB = tfB.get(term) || 0;

    // IDF calculation for 2 documents: log(1 + 2 / df)
    const df = (countA > 0 ? 1 : 0) + (countB > 0 ? 1 : 0);
    const idf = Math.log(1 + 2 / df);

    const weightA = countA * idf;
    const weightB = countB * idf;

    dotProduct += weightA * weightB;
    normA += weightA * weightA;
    normB += weightB * weightB;
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.min(1.0, Math.max(0, similarity));
}

/**
 * Group listings ONLY when brand and model match exactly AND similarity >= threshold
 * Different variants (e.g. 128 GB vs 256 GB) NEVER group.
 */
export function matchListings(listings: Listing[]): MatchedGroup[] {
  const groups: MatchedGroup[] = [];

  for (const listing of listings) {
    const { brand, modelNumber, variant } = extractAttributes(listing);

    // Look for matching group
    let matchedGroup: MatchedGroup | undefined;

    for (const group of groups) {
      // Must match brand, model number and variant strictly
      const isBrandMatch = group.brand.toLowerCase() === brand;
      const isModelMatch = group.modelNumber.toLowerCase() === modelNumber;
      const isVariantMatch = group.variant.toLowerCase() === variant;

      if (isBrandMatch && isModelMatch && isVariantMatch) {
        // Now check text similarity against the primary or group average
        const primaryListing = group.listings[0];
        const sim = computeSimilarity(listing.title, primaryListing.title);

        if (sim >= SCORING_CONFIG.matching.minimumSimilarityThreshold) {
          matchedGroup = group;
          const listingWithMatch: ListingWithMatch = {
            ...listing,
            matchConfidence: parseFloat(sim.toFixed(3)),
          };
          group.listings.push(listingWithMatch);
          break;
        }
      }
    }

    if (!matchedGroup) {
      // Create new group
      const newGroup: MatchedGroup = {
        groupId: `${brand}-${modelNumber}-${variant}`.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, ''),
        brand: listing.brand,
        modelNumber: listing.modelNumber,
        variant: listing.variant,
        listings: [
          {
            ...listing,
            matchConfidence: 1.0, // Primary listing in group has 1.0 confidence
          },
        ],
      };
      groups.push(newGroup);
    }
  }

  return groups;
}
