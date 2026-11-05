import { calculateDealScore, calculateEffectivePrice, analyzePriceTrend, calculateSellerTrust, matchListings } from './engines';
import { Listing } from './types';

export interface MatchAccuracy {
  /** Same-brand product pairs the engine correctly kept in separate groups. */
  correct: number;
  total: number;
  percent: number;
  /** Pairs where one group contained listings of both products (a wrong merge). */
  merged: string[];
  /** Products whose own retailer listings the engine failed to pull into a single group. */
  splitProducts: string[];
}

function groupByProduct(listings: Listing[]): Map<string, Listing[]> {
  const map = new Map<string, Listing[]>();
  for (const l of listings) {
    if (!map.has(l.productId)) map.set(l.productId, []);
    map.get(l.productId)!.push(l);
  }
  return map;
}

/**
 * Measures the engine's documented guarantee, "different models and variants NEVER group":
 * for every pair of different products from the same brand (iPhone 15 128 GB vs 256 GB,
 * iPhone 17 vs 17 Pro, WH-1000XM5 vs XM6 ...) it checks that no match group contains listings
 * of both. Also reports products whose own listings split across several groups (a recall
 * weakness: differently worded retailer titles falling under the similarity threshold).
 */
export function measureMatchAccuracy(listings: Listing[]): MatchAccuracy {
  const products = groupByProduct(listings);
  const ids = Array.from(products.keys());
  let correct = 0;
  let total = 0;
  const merged: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = products.get(ids[i])!;
      const b = products.get(ids[j])!;
      if (a[0].brand.toLowerCase() !== b[0].brand.toLowerCase()) continue;
      total++;
      const groups = matchListings([...a, ...b]);
      const contaminated = groups.some(
        (g) => g.listings.some((l) => l.productId === ids[i]) && g.listings.some((l) => l.productId === ids[j])
      );
      if (contaminated) merged.push(`${ids[i]} vs ${ids[j]}`);
      else correct++;
    }
  }

  const splitProducts = ids.filter((pid) => matchListings(products.get(pid)!).length > 1);

  return { correct, total, percent: total ? (correct / total) * 100 : 100, merged, splitProducts };
}

/** Average time, in ms, to run the full 4-engine pipeline over one product's listings. */
export function measureEngineLatency(listings: Listing[], runs = 25): number {
  const products = Array.from(groupByProduct(listings).values()).slice(0, 5);
  const once = () => {
    for (const ls of products) {
      matchListings(ls);
      const eps = ls.map((l) => calculateEffectivePrice(l));
      const lowest = Math.min(...eps.map((e) => e.effectivePrice));
      ls.forEach((l, i) => {
        const trend = analyzePriceTrend(l, []);
        const trust = calculateSellerTrust(l);
        calculateDealScore({
          listingId: l.id,
          platform: l.platform,
          matchConfidence: 1,
          effectivePriceBreakdown: eps[i],
          lowestEffectivePrice: lowest,
          trendAnalysis: trend,
          sellerTrustResult: trust,
        });
      });
    }
  };
  once(); // warm-up
  const start = performance.now();
  for (let r = 0; r < runs; r++) once();
  const perRun = (performance.now() - start) / runs;
  return perRun / products.length;
}
