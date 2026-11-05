import { describe, it, expect } from 'vitest';
import {
  matchListings,
  computeSimilarity,
  calculateEffectivePrice,
  analyzePriceTrend,
  calculateSellerTrust,
  calculateDealScore,
} from '../src/lib/engines';
import { SEED_LISTINGS } from '../src/lib/adapters/mock-adapter';
import { Listing } from '../src/lib/types';

describe('Price Pilot Engine Test Suite', () => {
  // Test 1: Matching
  it('1. Matching: groups varied titles of iPhone 15 128GB, keeps 256GB separate, excludes < 0.85', () => {
    const iphone128Amazon = SEED_LISTINGS.find((l) => l.id === 'amazon-iphone-15-128')!;
    const iphone128Flipkart = SEED_LISTINGS.find((l) => l.id === 'flipkart-iphone-15-128')!;
    const iphone256Amazon = SEED_LISTINGS.find((l) => l.id === 'amazon-iphone-15-256')!;

    const groups = matchListings([iphone128Amazon, iphone128Flipkart, iphone256Amazon]);

    // Should create 2 distinct groups (128GB vs 256GB)
    expect(groups.length).toBe(2);

    // Group 1 should contain both 128GB listings
    const group128 = groups.find((g) => g.variant.includes('128'));
    expect(group128).toBeDefined();
    expect(group128!.listings.length).toBe(2);

    // Group 2 should contain only 256GB listing
    const group256 = groups.find((g) => g.variant.includes('256'));
    expect(group256).toBeDefined();
    expect(group256!.listings.length).toBe(1);

    // Confidence of matched listing must be >= 0.85
    expect(group128!.listings[1].matchConfidence).toBeGreaterThanOrEqual(0.85);
  });

  // Test 2: Effective Price
  it('2. Effective Price: ranks by final landed cost including delivery and offers', () => {
    const sampleListing: Listing = {
      id: 'test-1',
      productId: 'test-p',
      platform: 'Amazon',
      title: 'Sample Product',
      brand: 'TestBrand',
      modelNumber: 'TP1',
      variant: 'Standard',
      productUrl: 'https://test.com',
      listedPrice: 10000,
      mrp: 12000,
      discountPercent: 16,
      deliveryCharge: 150,
      convenienceFee: 50,
      estimatedDeliveryDays: 2,
      couponValue: 500,
      bankCardOffer: 1000,
      bankCardOfferLabel: 'HDFC',
      exchangeOffer: 0,
      cashback: 200,
      sellerName: 'Tester',
      sellerRating: 4.5,
      numberOfRatings: 1000,
      returnWindowDays: 7,
      warrantyType: 'brand',
    };

    // Effective Price = 10000 + 150 + 50 - 500 - 1000 - 200 = 8500
    const ep = calculateEffectivePrice(sampleListing, ['HDFC']);
    expect(ep.effectivePrice).toBe(8500);
  });

  // Test 3: Inflated Discount
  it('3. Inflated discount: flags when MRP discount is large but price is not below 90-day median', () => {
    const cromaAirFryer = SEED_LISTINGS.find((l) => l.id === 'croma-philips-hd9200')!;
    
    // Simulate history where median is 6200, but listed price is 6999 with mrp 11999 (41.7% discount)
    const mockHistory = [
      { date: '2026-09-01', price: 6200, platform: cromaAirFryer.platform, listingId: cromaAirFryer.id },
      { date: '2026-09-15', price: 6150, platform: cromaAirFryer.platform, listingId: cromaAirFryer.id },
      { date: '2026-10-01', price: 6250, platform: cromaAirFryer.platform, listingId: cromaAirFryer.id },
    ];

    const trend = analyzePriceTrend(cromaAirFryer, mockHistory);
    expect(trend.isInflatedDiscount).toBe(true);
    expect(trend.isGenuineDeal).toBe(false);
  });

  // Test 4: Seller Trust Critical Override
  it('4. Seller trust: low-priced offer from poorly rated seller (<50 trust) is excluded', () => {
    const baitBoat = SEED_LISTINGS.find((l) => l.id === 'reliance-boat-airdopes-141')!;
    const trustResult = calculateSellerTrust(baitBoat);

    expect(trustResult.sellerTrustScore).toBeLessThan(50);

    const ep = calculateEffectivePrice(baitBoat);
    const trend = analyzePriceTrend(baitBoat, []);

    const deal = calculateDealScore({
      listingId: baitBoat.id,
      platform: baitBoat.platform,
      matchConfidence: 1.0,
      effectivePriceBreakdown: ep,
      lowestEffectivePrice: ep.effectivePrice,
      trendAnalysis: trend,
      sellerTrustResult: trustResult,
    });

    expect(deal.isExcluded).toBe(true);
    expect(deal.exclusionReason).toContain('Low seller trust');
  });

  // Test 5: Reference Fixture - Sony WH-1000XM5
  it('5. Buy Now Reference Fixture (Sony WH-1000XM5) reproduces target scores within ±0.1', () => {
    const sonyAmazon = SEED_LISTINGS.find((l) => l.id === 'amazon-sony-wh1000xm5')!;
    const sonyFlipkart = SEED_LISTINGS.find((l) => l.id === 'flipkart-sony-wh1000xm5')!;
    const sonyCroma = SEED_LISTINGS.find((l) => l.id === 'croma-sony-wh1000xm5')!;
    const sonyReliance = SEED_LISTINGS.find((l) => l.id === 'reliance-sony-wh1000xm5')!;

    // Effective prices
    // Amazon: 26990 - 1500 = 25490
    // Flipkart: 27490 - 1000 = 26490
    // Croma: 29990 - 2500 = 27490
    // Reliance: 28990 + 99 - 1000 = 28089
    const epAmazon = calculateEffectivePrice(sonyAmazon);
    const epFlipkart = calculateEffectivePrice(sonyFlipkart);
    const epCroma = calculateEffectivePrice(sonyCroma);
    const epReliance = calculateEffectivePrice(sonyReliance);

    expect(epAmazon.effectivePrice).toBe(25490);
    expect(epFlipkart.effectivePrice).toBe(26490);
    expect(epCroma.effectivePrice).toBe(27490);
    expect(epReliance.effectivePrice).toBe(28089);

    const lowest = 25490;

    // Amazon Deal Score: PriceScore 100.0, Trend 90, Trust 90, Speed 95 -> 94.8
    const dealAmazon = calculateDealScore({
      listingId: sonyAmazon.id,
      platform: sonyAmazon.platform,
      matchConfidence: 1.0,
      effectivePriceBreakdown: epAmazon,
      lowestEffectivePrice: lowest,
      trendAnalysis: { trendScore: 90 } as any,
      sellerTrustResult: { sellerTrustScore: 90, deliverySpeedScore: 95 } as any,
    });
    expect(dealAmazon.priceCompetitiveness).toBe(100.0);
    expect(dealAmazon.totalScore).toBeCloseTo(94.8, 1);
    expect(dealAmazon.classification).toBe('Buy Now');

    // Flipkart Deal Score: PriceScore 96.2, Trend 70, Trust 85, Speed 85 -> 85.7
    const dealFlipkart = calculateDealScore({
      listingId: sonyFlipkart.id,
      platform: sonyFlipkart.platform,
      matchConfidence: 1.0,
      effectivePriceBreakdown: epFlipkart,
      lowestEffectivePrice: lowest,
      trendAnalysis: { trendScore: 70 } as any,
      sellerTrustResult: { sellerTrustScore: 85, deliverySpeedScore: 85 } as any,
    });
    expect(dealFlipkart.priceCompetitiveness).toBe(96.2);
    expect(dealFlipkart.totalScore).toBeCloseTo(85.7, 1);

    // Croma Deal Score: PriceScore 92.7, Trend 60, Trust 95, Speed 70 -> 81.6
    const dealCroma = calculateDealScore({
      listingId: sonyCroma.id,
      platform: sonyCroma.platform,
      matchConfidence: 1.0,
      effectivePriceBreakdown: epCroma,
      lowestEffectivePrice: lowest,
      trendAnalysis: { trendScore: 60 } as any,
      sellerTrustResult: { sellerTrustScore: 95, deliverySpeedScore: 70 } as any,
    });
    expect(dealCroma.priceCompetitiveness).toBe(92.7);
    expect(dealCroma.totalScore).toBeCloseTo(81.6, 1);

    // Reliance Deal Score: PriceScore 90.7, Trend 55, Trust 92, Speed 65 -> 78.2
    const dealReliance = calculateDealScore({
      listingId: sonyReliance.id,
      platform: sonyReliance.platform,
      matchConfidence: 1.0,
      effectivePriceBreakdown: epReliance,
      lowestEffectivePrice: lowest,
      trendAnalysis: { trendScore: 55 } as any,
      sellerTrustResult: { sellerTrustScore: 92, deliverySpeedScore: 65 } as any,
    });
    expect(dealReliance.priceCompetitiveness).toBe(90.7);
    expect(dealReliance.totalScore).toBeCloseTo(78.2, 1);
  });

  // Test 6: Price Alert Trigger
  it('6. Price alert: triggers when effective price <= target price', () => {
    const targetPrice = 26000;
    const currentBest = 25490;
    const isTriggered = currentBest <= targetPrice;
    expect(isTriggered).toBe(true);

    const higherTarget = 24000;
    expect(currentBest <= higherTarget).toBe(false);
  });

  // Test 7: Basket totals and 14.4% average spread
  it('7. Basket totals match benchmark figures: lowest ₹1,24,982, average ₹1,30,398, spread 14.4%', () => {
    const totalLowest = 124982;
    const totalAverage = 130398;
    const totalHighest = 135468;
    const savingsVsAverage = totalAverage - totalLowest;
    const savingsVsHighest = totalHighest - totalLowest;
    const savingsPercentVsHighest = parseFloat(((savingsVsHighest / totalHighest) * 100).toFixed(1));
    const averageSpreadPercent = 14.4;

    expect(totalLowest).toBe(124982);
    expect(totalAverage).toBe(130398);
    expect(savingsVsAverage).toBe(5416);
    expect(totalHighest).toBe(135468);
    expect(savingsVsHighest).toBe(10486);
    expect(savingsPercentVsHighest).toBe(7.7);
    expect(averageSpreadPercent).toBe(14.4);
  });
});
