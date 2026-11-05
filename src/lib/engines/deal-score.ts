import { DealScore, EffectivePriceBreakdown, PriceTrendAnalysis, SellerTrustResult, PlatformName } from '../types';
import { SCORING_CONFIG } from './scoring.config';

export interface DealScoreInput {
  listingId: string;
  platform: PlatformName;
  matchConfidence: number;
  effectivePriceBreakdown: EffectivePriceBreakdown;
  lowestEffectivePrice: number;
  trendAnalysis: PriceTrendAnalysis;
  sellerTrustResult: SellerTrustResult;
  customSpeedWeight?: number;
}

/**
 * Consensus Deal Score:
 * Deal Score (0-100) = 0.40 * PriceCompetitiveness + 0.25 * PriceTrend + 0.20 * SellerTrust + 0.15 * DeliverySpeed
 * Price Competitiveness = (lowest effective price / this platform's effective price) * 100
 *
 * CRITICAL OVERRIDE:
 * If matchConfidence < 0.85 OR sellerTrust < 50, exclude from recommendations regardless of price.
 *
 * Classification:
 * 70-100 = Buy Now
 * 40-69 = Wait / Consider
 * 0-39 = Avoid
 */
export function calculateDealScore(input: DealScoreInput): DealScore {
  const {
    listingId,
    platform,
    matchConfidence,
    effectivePriceBreakdown,
    lowestEffectivePrice,
    trendAnalysis,
    sellerTrustResult,
    customSpeedWeight,
  } = input;

  const thisEffectivePrice = effectivePriceBreakdown.effectivePrice;

  // 1. Price Competitiveness (0-100)
  let rawPriceScore = 0;
  if (thisEffectivePrice > 0 && lowestEffectivePrice > 0) {
    rawPriceScore = (lowestEffectivePrice / thisEffectivePrice) * 100;
  }
  const priceCompetitiveness = parseFloat(rawPriceScore.toFixed(1));

  const trendScore = trendAnalysis.trendScore;
  const sellerTrustScore = sellerTrustResult.sellerTrustScore;
  const deliverySpeedScore = sellerTrustResult.deliverySpeedScore;

  // Determine weights
  let wPrice = SCORING_CONFIG.weights.priceCompetitiveness;
  let wTrend = SCORING_CONFIG.weights.priceTrend;
  let wTrust = SCORING_CONFIG.weights.sellerTrust;
  let wSpeed = SCORING_CONFIG.weights.deliverySpeed;

  if (customSpeedWeight !== undefined && customSpeedWeight !== wSpeed) {
    wSpeed = customSpeedWeight;
    const remaining = 1.0 - wSpeed;
    const baseRemaining = 0.85;
    wPrice = (0.40 / baseRemaining) * remaining;
    wTrend = (0.25 / baseRemaining) * remaining;
    wTrust = (0.20 / baseRemaining) * remaining;
  }

  // Consensus formula
  const calculatedTotal =
    wPrice * priceCompetitiveness +
    wTrend * trendScore +
    wTrust * sellerTrustScore +
    wSpeed * deliverySpeedScore;

  const totalScore = parseFloat(calculatedTotal.toFixed(1));

  // Critical Overrides
  let isExcluded = false;
  let exclusionReason: string | undefined;

  if (matchConfidence < SCORING_CONFIG.overrides.minMatchConfidence) {
    isExcluded = true;
    exclusionReason = `Low match confidence (${(matchConfidence * 100).toFixed(0)}% < 85%) - possible mismatched product or variant`;
  } else if (sellerTrustScore < SCORING_CONFIG.overrides.minSellerTrust) {
    isExcluded = true;
    exclusionReason = `Low seller trust (${sellerTrustScore}/100 < 50) - high risk of counterfeit, damaged goods, or non-delivery`;
  }

  // Classification
  let classification: 'Buy Now' | 'Wait / Consider' | 'Avoid';
  if (totalScore >= SCORING_CONFIG.classification.buyNowMin) {
    classification = 'Buy Now';
  } else if (totalScore >= SCORING_CONFIG.classification.waitConsiderMin) {
    classification = 'Wait / Consider';
  } else {
    classification = 'Avoid';
  }

  // Reason generation
  const reasons: string[] = [];
  if (priceCompetitiveness >= 99.9) {
    reasons.push('Lowest effective payable price across all platforms');
  } else if (priceCompetitiveness >= 95) {
    reasons.push('Within 5% of lowest price');
  }

  if (trendAnalysis.isGenuineDeal) {
    reasons.push(`Genuine deal: ${trendAnalysis.percentBelowMedian}% below 90-day median`);
  } else if (trendAnalysis.isInflatedDiscount) {
    reasons.push('Warning: Inflated discount (MRP inflated; price not below 90-day median)');
  } else if (trendAnalysis.trend === 'rising') {
    reasons.push('Price trend is rising — good time to lock in before further increases');
  } else if (trendAnalysis.trend === 'falling') {
    reasons.push('Price trend is falling — consider waiting for lower prices');
  }

  if (sellerTrustScore >= 90) {
    reasons.push('Highly trusted top-tier seller with extensive verified reviews');
  } else if (sellerTrustScore < 50) {
    reasons.push('Bait deal risk: Seller has poor rating or unverified track record');
  }

  if (deliverySpeedScore >= 90) {
    reasons.push('Fast delivery (same or next day shipping)');
  }

  return {
    listingId,
    platform,
    priceCompetitiveness,
    trendScore,
    sellerTrustScore,
    deliverySpeedScore,
    totalScore,
    classification,
    isExcluded,
    exclusionReason,
    reasons,
  };
}
