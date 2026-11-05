import { calculateEffectivePrice } from './engines';
import { BasketItem, BasketSummary, Listing } from './types';

/** The five benchmark products the Basket page aggregates. */
export const BASKET_PRODUCT_IDS = [
  'iphone-15-128gb',
  'sony-wh1000xm5',
  'samsung-43-crystal-4k',
  'boat-airdopes-141',
  'philips-air-fryer-hd9200',
];

/**
 * Basket totals computed from the per-product rows (effective landed price after fees,
 * coupons and card offers), so the headline numbers always add up to what the table shows.
 * Shared by /api/basket and the evaluation dashboard.
 */
export function computeBasket(allListings: Listing[], productIds: string[] = BASKET_PRODUCT_IDS): BasketSummary {
  const items: BasketItem[] = [];

  for (const pid of productIds) {
    const pListings = allListings.filter((l) => l.productId === pid);
    if (pListings.length === 0) continue;

    const effectiveListings = pListings
      .map((l) => ({ listing: l, ep: calculateEffectivePrice(l).effectivePrice }))
      .sort((a, b) => a.ep - b.ep);
    const lowest = effectiveListings[0];
    const highest = effectiveListings[effectiveListings.length - 1];
    const avg = Math.round(effectiveListings.reduce((sum, item) => sum + item.ep, 0) / effectiveListings.length);

    items.push({
      productId: pid,
      productName: `${lowest.listing.brand} ${lowest.listing.modelNumber}`,
      lowestPrice: lowest.ep,
      lowestPlatform: lowest.listing.platform,
      averagePrice: avg,
      highestPrice: highest.ep,
      highestPlatform: highest.listing.platform,
    });
  }

  const totalLowest = items.reduce((sum, i) => sum + i.lowestPrice, 0);
  const totalAverage = items.reduce((sum, i) => sum + i.averagePrice, 0);
  const totalHighest = items.reduce((sum, i) => sum + i.highestPrice, 0);
  const savingsVsAverage = totalAverage - totalLowest;
  const savingsVsHighest = totalHighest - totalLowest;
  const savingsPercentVsHighest =
    totalHighest > 0 ? parseFloat(((savingsVsHighest / totalHighest) * 100).toFixed(1)) : 0;
  // Mean, across products, of how much dearer the priciest store is than the cheapest.
  const averageSpreadPercent =
    items.length > 0
      ? parseFloat(
          ((items.reduce((sum, i) => sum + (i.highestPrice - i.lowestPrice) / i.lowestPrice, 0) / items.length) * 100).toFixed(1)
        )
      : 0;

  return {
    items,
    totalLowest,
    totalAverage,
    totalHighest,
    savingsVsAverage,
    savingsVsHighest,
    savingsPercentVsHighest,
    averageSpreadPercent,
  };
}
