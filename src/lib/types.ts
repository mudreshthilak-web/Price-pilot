// Shared types for Price Pilot
import type { SearchOptions, SearchResult } from './search';

export type PlatformName = 
  | 'Amazon' 
  | 'Flipkart' 
  | 'Croma' 
  | 'Reliance Digital'
  | 'Tata CLiQ'
  | 'Myntra'
  | 'Vijay Sales'
  | 'Meesho';

export interface Listing {
  id: string;
  productId: string;
  platform: PlatformName;
  title: string;
  brand: string;
  modelNumber: string;
  variant: string; // e.g. "128 GB, Blue"
  productUrl: string;
  listedPrice: number;
  mrp: number;
  discountPercent: number;
  deliveryCharge: number;
  convenienceFee: number;
  estimatedDeliveryDays: number;
  couponValue: number;
  bankCardOffer: number;
  bankCardOfferLabel: string; // e.g. "HDFC Credit Card"
  exchangeOffer: number;
  cashback: number;
  sellerName: string;
  sellerRating: number; // 0-5
  numberOfRatings: number;
  returnWindowDays: number;
  warrantyType: 'brand' | 'seller' | 'none';
}

export interface PriceHistoryEntry {
  date: string; // ISO date string YYYY-MM-DD
  price: number;
  platform: PlatformName;
  listingId: string;
}

export interface ListingWithMatch extends Listing {
  matchConfidence: number;
}

export interface MatchedGroup {
  groupId: string;
  brand: string;
  modelNumber: string;
  variant: string;
  listings: ListingWithMatch[];
}

export interface EffectivePriceBreakdown {
  listingId: string;
  platform: PlatformName;
  listedPrice: number;
  deliveryCharge: number;
  convenienceFee: number;
  couponDiscount: number;
  bankCardOffer: number;
  exchangeOffer: number;
  cashback: number;
  effectivePrice: number;
}

export interface PriceTrendAnalysis {
  listingId: string;
  platform: PlatformName;
  currentPrice: number;
  median90Day: number;
  lowestPrice: number;
  lowestPriceDate: string;
  trend: 'rising' | 'stable' | 'falling';
  trendScore: number; // 0-100
  isGenuineDeal: boolean;
  isInflatedDiscount: boolean;
  percentBelowMedian: number;
}

export interface SellerTrustResult {
  listingId: string;
  platform: PlatformName;
  sellerTrustScore: number; // 0-100
  deliverySpeedScore: number; // 0-100
  details: {
    ratingScore: number;
    reviewVolumeScore: number;
    returnWindowScore: number;
    warrantyScore: number;
  };
}

export interface DealScore {
  listingId: string;
  platform: PlatformName;
  priceCompetitiveness: number; // 0-100
  trendScore: number; // 0-100
  sellerTrustScore: number; // 0-100
  deliverySpeedScore: number; // 0-100
  totalScore: number; // 0-100
  classification: 'Buy Now' | 'Wait / Consider' | 'Avoid';
  isExcluded: boolean;
  exclusionReason?: string;
  reasons: string[];
}

export interface ProductComparisonListing {
  listing: Listing;
  matchConfidence: number;
  effectivePrice: EffectivePriceBreakdown;
  priceTrend: PriceTrendAnalysis;
  sellerTrust: SellerTrustResult;
  dealScore: DealScore;
}

export interface ComparisonResult {
  product: {
    id: string;
    brand: string;
    modelNumber: string;
    variant: string;
    name: string;
    category: string;
    imageUrl?: string;
  };
  listings: ProductComparisonListing[];
  recommendation: {
    bestDeal: DealScore | null;
    summary: string;
  };
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentBestPrice: number;
  isTriggered: boolean;
  createdAt: string;
  triggeredAt?: string;
  platform?: PlatformName;
}

export interface UserPreferences {
  preferredPlatforms: PlatformName[];
  paymentCards: string[];
  deliveryUrgency: 'standard' | 'fast' | 'express';
  useCustomWeights: boolean;
  speedWeightOverride?: number;
}

export interface BasketItem {
  productId: string;
  productName: string;
  lowestPrice: number;
  lowestPlatform: PlatformName;
  averagePrice: number;
  highestPrice: number;
  highestPlatform: PlatformName;
}

export interface BasketSummary {
  items: BasketItem[];
  totalLowest: number;
  totalAverage: number;
  totalHighest: number;
  savingsVsAverage: number;
  savingsVsHighest: number;
  savingsPercentVsHighest: number;
  averageSpreadPercent: number;
}

export interface PlatformAdapter {
  /**
   * Optional ranked catalog search (brand/category/budget aware). Adapters that cannot do this
   * (e.g. a future live adapter that delegates search to retailer APIs) omit it and the search
   * route falls back to grouping `fetchListings` results.
   */
  searchCatalog?(query: string, options?: SearchOptions): SearchResult;
  fetchListings(query?: string): Promise<Listing[]>;
  fetchPriceHistory(listingId: string): Promise<PriceHistoryEntry[]>;
  fetchAllListings(): Promise<Listing[]>;
}
