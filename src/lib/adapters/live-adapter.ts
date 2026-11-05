import { PlatformAdapter, Listing, PriceHistoryEntry } from '../types';

/**
 * LiveAdapter - Extension point for official retailer affiliate / product advertising APIs.
 *
 * IMPORTANT COMPLIANCE NOTE:
 * Live collection must follow each platform's Terms of Service and API policies:
 * - Amazon: Product Advertising API (PA-API 5.0) via Associates account
 * - Flipkart: Flipkart Affiliate API
 * - Croma: Tata Neu / Croma Partner APIs
 * - Reliance Digital: Reliance Retail Partner APIs
 *
 * DO NOT build scrapers that bypass platform terms of use, robot.txt policies,
 * or bot protection systems (Cloudflare, Akamai, PerimeterX).
 */
export class LiveAdapter implements PlatformAdapter {
  async fetchListings(_query?: string): Promise<Listing[]> {
    throw new Error(
      'LiveAdapter is a documented extension stub. Set DATA_SOURCE=mock in .env to use seeded sample data. ' +
      'To enable live data, configure official affiliate API credentials as documented in README.md.'
    );
  }

  async fetchPriceHistory(_listingId: string): Promise<PriceHistoryEntry[]> {
    throw new Error(
      'LiveAdapter is a documented extension stub. Set DATA_SOURCE=mock in .env to use seeded sample data.'
    );
  }

  async fetchAllListings(): Promise<Listing[]> {
    throw new Error(
      'LiveAdapter is a documented extension stub. Set DATA_SOURCE=mock in .env to use seeded sample data.'
    );
  }
}
