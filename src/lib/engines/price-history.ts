import { Listing, PriceHistoryEntry, PriceTrendAnalysis } from '../types';
import { SCORING_CONFIG } from './scoring.config';

/**
 * Calculate the median of an array of numbers
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Calculate Simple Moving Average of the last N entries
 */
function calculateSMA(entries: PriceHistoryEntry[], period: number = 7): number {
  if (entries.length === 0) return 0;
  const recent = entries.slice(-period);
  const sum = recent.reduce((acc, curr) => acc + curr.price, 0);
  return sum / recent.length;
}

/**
 * Engine 3: Price History & Trend
 * - Compares current price to 90-day median
 * - Genuine deal flag if >= 10% below median
 * - Inflated discount flag if MRP discount is large but current price is >= median
 * - Simple moving average trend: rising / stable / falling
 * - 0-100 Price Trend Score
 */
export function analyzePriceTrend(
  listing: Listing,
  history: PriceHistoryEntry[],
  trendScoreOverride?: number
): PriceTrendAnalysis {
  const currentPrice = listing.listedPrice;

  // If empty history, synthesize default metrics
  if (!history || history.length === 0) {
    return {
      listingId: listing.id,
      platform: listing.platform,
      currentPrice,
      median90Day: currentPrice,
      lowestPrice: currentPrice,
      lowestPriceDate: new Date().toISOString().split('T')[0],
      trend: 'stable',
      trendScore: trendScoreOverride ?? 70,
      isGenuineDeal: false,
      isInflatedDiscount: false,
      percentBelowMedian: 0,
    };
  }

  // Calculate 90-day median and historical lowest
  const prices = history.map((h) => h.price);
  const median90Day = calculateMedian(prices);

  let lowestPrice = Infinity;
  let lowestPriceDate = history[0]?.date || '';

  for (const entry of history) {
    if (entry.price < lowestPrice) {
      lowestPrice = entry.price;
      lowestPriceDate = entry.date;
    }
  }

  // Also compare with current price for the lowest overall
  if (currentPrice < lowestPrice) {
    lowestPrice = currentPrice;
    lowestPriceDate = 'Today';
  }

  // Genuine deal flag: >= 10% below 90-day median
  const percentDiffFromMedian = ((median90Day - currentPrice) / median90Day) * 100;
  const isGenuineDeal = percentDiffFromMedian >= SCORING_CONFIG.priceTrend.genuineDealThresholdPercent;

  // Inflated discount: MRP discount >= 20%, but price is not below median (currentPrice >= median90Day)
  const displayedDiscount = listing.mrp > 0 ? ((listing.mrp - currentPrice) / listing.mrp) * 100 : 0;
  const isInflatedDiscount =
    displayedDiscount >= SCORING_CONFIG.priceTrend.inflatedDiscountMRPThreshold &&
    currentPrice >= median90Day;

  // Moving average trend determination (compare last 7 days vs previous 7 days)
  const smaRecent = calculateSMA(history.slice(-7), 7);
  const smaPrevious = calculateSMA(history.slice(-14, -7), 7);

  let trend: 'rising' | 'stable' | 'falling' = 'stable';
  if (smaPrevious > 0) {
    const changePct = ((smaRecent - smaPrevious) / smaPrevious) * 100;
    if (changePct > SCORING_CONFIG.priceTrend.risingThreshold) {
      trend = 'rising';
    } else if (changePct < SCORING_CONFIG.priceTrend.fallingThreshold) {
      trend = 'falling';
    }
  }

  // Price Trend Score calculation (0-100)
  // Can be explicitly provided (e.g. from reference fixture) or determined formulaically
  let trendScore = trendScoreOverride;
  if (trendScore === undefined) {
    if (isGenuineDeal) {
      trendScore = Math.min(100, Math.round(75 + percentDiffFromMedian));
    } else if (currentPrice < median90Day) {
      trendScore = Math.round(60 + (percentDiffFromMedian / 10) * 15);
    } else if (isInflatedDiscount) {
      trendScore = 35;
    } else if (currentPrice > median90Day) {
      trendScore = Math.max(30, Math.round(55 - ((currentPrice - median90Day) / median90Day) * 50));
    } else {
      trendScore = 60;
    }
  }

  return {
    listingId: listing.id,
    platform: listing.platform,
    currentPrice,
    median90Day,
    lowestPrice,
    lowestPriceDate,
    trend,
    trendScore,
    isGenuineDeal,
    isInflatedDiscount,
    percentBelowMedian: parseFloat(percentDiffFromMedian.toFixed(1)),
  };
}
