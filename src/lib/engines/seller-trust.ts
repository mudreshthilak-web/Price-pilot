import { Listing, SellerTrustResult } from '../types';
import { SCORING_CONFIG } from './scoring.config';

/**
 * Engine 4: Seller Trust and Delivery Speed
 * - Seller Trust (0-100) from seller rating, number of reviews, return window, warranty authenticity
 * - Delivery Speed score (0-100) from estimated delivery days
 */
export function calculateSellerTrust(
  listing: Listing,
  trustOverride?: number,
  speedOverride?: number
): SellerTrustResult {
  // If specific overrides provided (e.g. for reference fixtures)
  if (trustOverride !== undefined && speedOverride !== undefined) {
    return {
      listingId: listing.id,
      platform: listing.platform,
      sellerTrustScore: trustOverride,
      deliverySpeedScore: speedOverride,
      details: {
        ratingScore: trustOverride,
        reviewVolumeScore: trustOverride,
        returnWindowScore: trustOverride,
        warrantyScore: trustOverride,
      },
    };
  }

  // 1. Rating score (0-5 mapped to 0-100)
  // 5.0 -> 100, 4.5 -> 90, 4.0 -> 80, 3.0 -> 50, <2.5 -> <30
  const rating = listing.sellerRating || 0;
  const ratingScore = Math.min(100, Math.max(0, (rating / 5) * 100));

  // 2. Review volume score
  const reviews = listing.numberOfRatings || 0;
  let reviewVolumeScore = 50;
  if (reviews >= 10000) reviewVolumeScore = 100;
  else if (reviews >= 5000) reviewVolumeScore = 90;
  else if (reviews >= 1000) reviewVolumeScore = 80;
  else if (reviews >= 200) reviewVolumeScore = 65;
  else if (reviews >= 50) reviewVolumeScore = 40;
  else reviewVolumeScore = 20;

  // 3. Return window score
  const returns = listing.returnWindowDays || 0;
  let returnWindowScore = 20;
  if (returns >= 14) returnWindowScore = 100;
  else if (returns >= 10) returnWindowScore = 85;
  else if (returns >= 7) returnWindowScore = 70;
  else if (returns > 0) returnWindowScore = 50;
  else returnWindowScore = 10;

  // 4. Warranty score
  let warrantyScore = 30;
  if (listing.warrantyType === 'brand') warrantyScore = 100;
  else if (listing.warrantyType === 'seller') warrantyScore = 60;
  else warrantyScore = 10;

  // Weighted Seller Trust
  const calculatedTrust =
    ratingScore * SCORING_CONFIG.sellerTrust.ratingWeight +
    reviewVolumeScore * SCORING_CONFIG.sellerTrust.reviewVolumeWeight +
    returnWindowScore * SCORING_CONFIG.sellerTrust.returnWindowWeight +
    warrantyScore * SCORING_CONFIG.sellerTrust.warrantyWeight;

  const sellerTrustScore = trustOverride ?? Math.round(calculatedTrust);

  // Delivery Speed Score
  let deliverySpeedScore = speedOverride;
  if (deliverySpeedScore === undefined) {
    const days = listing.estimatedDeliveryDays || 5;
    const speedMap = SCORING_CONFIG.deliverySpeed as Record<number, number>;
    if (speedMap[days]) {
      deliverySpeedScore = speedMap[days];
    } else if (days <= 1) {
      deliverySpeedScore = 95;
    } else if (days >= 10) {
      deliverySpeedScore = 25;
    } else {
      deliverySpeedScore = Math.max(30, 100 - days * 7);
    }
  }

  return {
    listingId: listing.id,
    platform: listing.platform,
    sellerTrustScore,
    deliverySpeedScore,
    details: {
      ratingScore: Math.round(ratingScore),
      reviewVolumeScore: Math.round(reviewVolumeScore),
      returnWindowScore: Math.round(returnWindowScore),
      warrantyScore: Math.round(warrantyScore),
    },
  };
}
