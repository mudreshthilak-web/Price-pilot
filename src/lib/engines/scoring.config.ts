export const SCORING_CONFIG = {
  // Consensus Deal Score weights (must sum to 1.0)
  weights: {
    priceCompetitiveness: 0.40,
    priceTrend: 0.25,
    sellerTrust: 0.20,
    deliverySpeed: 0.15,
  },

  // Product matching
  matching: {
    minimumSimilarityThreshold: 0.85,
    marketingWords: [
      'new', 'latest', 'best', 'sale', 'offer', 'deal', 'limited',
      'edition', 'exclusive', 'genuine', 'original', 'authentic',
      'imported', 'sealed', 'box', 'pack', 'with', 'free', 'gift',
      'combo', 'bundle', 'set', 'kit', 'warranty', 'year', 'month',
      'official', 'smart', 'wireless', 'true', 'pro', 'max'
    ],
  },

  // Price trend
  priceTrend: {
    genuineDealThresholdPercent: 10, // >=10% below median
    inflatedDiscountMRPThreshold: 20, // displayed MRP discount >= 20%
    risingThreshold: 2, // >2% increase over SMA
    fallingThreshold: -2, // <-2% decrease over SMA
  },

  // Seller trust scoring weights
  sellerTrust: {
    ratingWeight: 0.40,
    reviewVolumeWeight: 0.25,
    returnWindowWeight: 0.20,
    warrantyWeight: 0.15,
    minTrustForRecommendation: 50,
  },

  // Delivery speed scoring mapping (estimated days -> score 0-100)
  deliverySpeed: {
    1: 95,
    2: 85,
    3: 75,
    4: 70,
    5: 70,
    6: 65,
    7: 50,
    8: 40,
    10: 25,
  },

  // Deal classification thresholds
  classification: {
    buyNowMin: 70,
    waitConsiderMin: 40,
    // 0-39 = Avoid
  },

  // Critical overrides
  overrides: {
    minMatchConfidence: 0.85,
    minSellerTrust: 50,
  },
};
