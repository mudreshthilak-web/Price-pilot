import { Listing, EffectivePriceBreakdown } from '../types';

/**
 * Effective Price (Landed Cost) = Listed Price + Delivery and Fees - Coupons - Bank/Card Offers
 * (Excludes exchange offers from direct cash landed cost, notes cashback)
 */
export function calculateEffectivePrice(
  listing: Listing,
  userCards: string[] = []
): EffectivePriceBreakdown {
  const listedPrice = listing.listedPrice || 0;
  const deliveryCharge = listing.deliveryCharge || 0;
  const convenienceFee = listing.convenienceFee || 0;
  const couponDiscount = listing.couponValue || 0;

  // Check if bank card offer applies:
  // If user has not specified cards, we can apply card offers if none requested,
  // or apply if the user has that specific card.
  let bankCardOffer = 0;
  if (listing.bankCardOffer > 0) {
    if (userCards.length === 0) {
      // By default without selected cards, bank offers are either applied if generic or 0
      bankCardOffer = listing.bankCardOffer;
    } else {
      const match = userCards.some((card) =>
        listing.bankCardOfferLabel?.toLowerCase().includes(card.toLowerCase())
      );
      if (match) {
        bankCardOffer = listing.bankCardOffer;
      }
    }
  }

  const cashback = listing.cashback || 0;
  const exchangeOffer = listing.exchangeOffer || 0;

  const effectivePrice = Math.max(
    0,
    listedPrice + deliveryCharge + convenienceFee - couponDiscount - bankCardOffer - cashback
  );

  return {
    listingId: listing.id,
    platform: listing.platform,
    listedPrice,
    deliveryCharge,
    convenienceFee,
    couponDiscount,
    bankCardOffer,
    exchangeOffer,
    cashback,
    effectivePrice,
  };
}

/**
 * Rank listings from lowest to highest effective price
 */
export function rankByEffectivePrice(
  listings: Listing[],
  userCards: string[] = []
): EffectivePriceBreakdown[] {
  return listings
    .map((l) => calculateEffectivePrice(l, userCards))
    .sort((a, b) => a.effectivePrice - b.effectivePrice);
}
