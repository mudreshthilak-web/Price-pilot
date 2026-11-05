import { Listing, PlatformName } from './types';

/**
 * Structured sample catalog.
 *
 * Replaces the old "synthesize a listing from whatever the user typed" approach, which
 * produced "Generic"/"AudioTech" products for queries like "phones". Every product here
 * is a real, named model, so search can return real brands and real current models.
 *
 * All prices are ILLUSTRATIVE sample data (the app runs with DATA_SOURCE=mock). They are
 * loosely anchored on reported India launch prices where known, but are not live prices.
 * Showing genuinely current inventory requires the LiveAdapter (official affiliate APIs).
 */

export type ProductCategory = 'Electronics' | 'Accessories' | 'Appliances' | 'Fashion';

export interface CatalogEntry {
  productId: string;
  brand: string;
  model: string;
  variant: string;
  category: ProductCategory;
  /** Finer grain used by search ("phones", "laptops", "tv"...). */
  subcategory: string;
  /** Release month, YYYY-MM. Used for "newest first" ordering and the "New" badge. */
  released: string;
  price: number;
  mrp: number;
}

export interface ProductMeta {
  category: ProductCategory;
  subcategory: string;
  released: string;
}

/** Metadata for the six hand-seeded benchmark products in mock-adapter.ts. */
export const SEED_PRODUCT_META: Record<string, ProductMeta> = {
  'iphone-15-128gb': { category: 'Electronics', subcategory: 'Smartphones', released: '2023-09' },
  'iphone-15-256gb': { category: 'Electronics', subcategory: 'Smartphones', released: '2023-09' },
  'sony-wh1000xm5': { category: 'Accessories', subcategory: 'Headphones', released: '2022-05' },
  'samsung-43-crystal-4k': { category: 'Electronics', subcategory: 'TVs', released: '2023-06' },
  'boat-airdopes-141': { category: 'Accessories', subcategory: 'Headphones', released: '2022-01' },
  'philips-air-fryer-hd9200': { category: 'Appliances', subcategory: 'Air Fryers', released: '2022-03' },
};

const e = (
  productId: string,
  brand: string,
  model: string,
  variant: string,
  category: ProductCategory,
  subcategory: string,
  released: string,
  price: number,
  mrp: number
): CatalogEntry => ({ productId, brand, model, variant, category, subcategory, released, price, mrp });

export const CATALOG: CatalogEntry[] = [
  // ── Smartphones: Apple ────────────────────────────────────────────────
  e('iphone-18-pro-max-256gb', 'Apple', 'iPhone 18 Pro Max', '256 GB', 'Electronics', 'Smartphones', '2026-09', 179900, 179900),
  e('iphone-18-pro-256gb', 'Apple', 'iPhone 18 Pro', '256 GB', 'Electronics', 'Smartphones', '2026-09', 164900, 164900),
  e('iphone-17-pro-max-256gb', 'Apple', 'iPhone 17 Pro Max', '256 GB', 'Electronics', 'Smartphones', '2025-09', 159900, 164900),
  e('iphone-17-pro-256gb', 'Apple', 'iPhone 17 Pro', '256 GB', 'Electronics', 'Smartphones', '2025-09', 139900, 144900),
  e('iphone-air-256gb', 'Apple', 'iPhone Air', '256 GB', 'Electronics', 'Smartphones', '2025-09', 149900, 149900),
  e('iphone-17-256gb', 'Apple', 'iPhone 17', '256 GB', 'Electronics', 'Smartphones', '2025-09', 99900, 99900),
  e('iphone-17e-128gb', 'Apple', 'iPhone 17e', '128 GB', 'Electronics', 'Smartphones', '2026-02', 79900, 79900),
  e('iphone-16-128gb', 'Apple', 'iPhone 16', '128 GB', 'Electronics', 'Smartphones', '2024-09', 79900, 89900),
  e('iphone-16-plus-128gb', 'Apple', 'iPhone 16 Plus', '128 GB', 'Electronics', 'Smartphones', '2024-09', 89900, 99900),

  // ── Smartphones: Samsung ──────────────────────────────────────────────
  e('samsung-galaxy-s26-ultra-256gb', 'Samsung', 'Galaxy S26 Ultra', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2026-02', 139999, 139999),
  e('samsung-galaxy-s26-plus-256gb', 'Samsung', 'Galaxy S26+', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2026-02', 119999, 119999),
  e('samsung-galaxy-s26-256gb', 'Samsung', 'Galaxy S26', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2026-02', 87999, 87999),
  e('samsung-galaxy-s25-ultra-256gb', 'Samsung', 'Galaxy S25 Ultra', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-01', 109999, 129999),
  e('samsung-galaxy-z-fold7-256gb', 'Samsung', 'Galaxy Z Fold7', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-07', 164999, 174999),
  e('samsung-galaxy-z-flip7-256gb', 'Samsung', 'Galaxy Z Flip7', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-07', 89999, 109999),
  e('samsung-galaxy-a56-128gb', 'Samsung', 'Galaxy A56 5G', '8 GB + 128 GB', 'Electronics', 'Smartphones', '2025-03', 36999, 44999),

  // ── Smartphones: other brands ─────────────────────────────────────────
  e('oneplus-15-256gb', 'OnePlus', 'OnePlus 15', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-11', 72999, 76999),
  e('oneplus-13-256gb', 'OnePlus', 'OnePlus 13', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-01', 64999, 69999),
  e('oneplus-nord-5-256gb', 'OnePlus', 'OnePlus Nord 5', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-07', 31999, 34999),
  e('google-pixel-10-pro-256gb', 'Google', 'Pixel 10 Pro', '16 GB + 256 GB', 'Electronics', 'Smartphones', '2025-08', 109999, 119999),
  e('google-pixel-10-256gb', 'Google', 'Pixel 10', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-08', 79999, 79999),
  e('google-pixel-10a-128gb', 'Google', 'Pixel 10a', '8 GB + 128 GB', 'Electronics', 'Smartphones', '2026-03', 49999, 52999),
  e('xiaomi-17-256gb', 'Xiaomi', 'Xiaomi 17', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2026-03', 69999, 74999),
  e('nothing-phone-3-256gb', 'Nothing', 'Phone (3)', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-07', 62999, 79999),
  e('iqoo-15-256gb', 'iQOO', 'iQOO 15', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-11', 59999, 64999),
  e('realme-gt-7-256gb', 'Realme', 'Realme GT 7', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-05', 39999, 44999),
  e('vivo-v60-256gb', 'Vivo', 'Vivo V60', '12 GB + 256 GB', 'Electronics', 'Smartphones', '2025-08', 38999, 42999),

  // Budget and mid-range phones, so searches like "phones under 30000" have real answers.
  e('redmi-note-14-5g-128gb', 'Xiaomi', 'Redmi Note 14 5G', '6 GB + 128 GB', 'Electronics', 'Smartphones', '2024-12', 18999, 24999),
  e('poco-x7-pro-256gb', 'Poco', 'Poco X7 Pro', '8 GB + 256 GB', 'Electronics', 'Smartphones', '2025-01', 26999, 31999),
  e('motorola-edge-60-fusion-256gb', 'Motorola', 'Motorola Edge 60 Fusion', '8 GB + 256 GB', 'Electronics', 'Smartphones', '2025-04', 22999, 27999),
  e('samsung-galaxy-m36-128gb', 'Samsung', 'Galaxy M36 5G', '6 GB + 128 GB', 'Electronics', 'Smartphones', '2025-06', 16999, 21999),
  e('iqoo-z10-128gb', 'iQOO', 'iQOO Z10', '8 GB + 128 GB', 'Electronics', 'Smartphones', '2025-04', 19999, 25999),
  e('vivo-t4-5g-128gb', 'Vivo', 'Vivo T4 5G', '8 GB + 128 GB', 'Electronics', 'Smartphones', '2025-04', 21999, 25999),
  e('nothing-phone-3a-128gb', 'Nothing', 'Phone (3a)', '8 GB + 128 GB', 'Electronics', 'Smartphones', '2025-03', 24999, 27999),
  e('realme-narzo-80-pro-128gb', 'Realme', 'Realme Narzo 80 Pro', '8 GB + 128 GB', 'Electronics', 'Smartphones', '2025-04', 19999, 25999),

  // ── Laptops & tablets ─────────────────────────────────────────────────
  e('apple-macbook-air-m4-13', 'Apple', 'MacBook Air M4 (13-inch)', '16 GB RAM, 256 GB SSD', 'Electronics', 'Laptops', '2025-03', 94900, 99900),
  e('apple-macbook-air-m2-13', 'Apple', 'MacBook Air M2 (13-inch)', '8 GB RAM, 256 GB SSD', 'Electronics', 'Laptops', '2022-07', 84990, 99900),
  e('apple-macbook-pro-m4-14', 'Apple', 'MacBook Pro M4 (14-inch)', '16 GB RAM, 512 GB SSD', 'Electronics', 'Laptops', '2024-11', 159900, 169900),
  e('dell-xps-13-9350', 'Dell', 'XPS 13 (9350)', '16 GB RAM, 512 GB SSD', 'Electronics', 'Laptops', '2025-01', 134990, 149990),
  e('hp-pavilion-15', 'HP', 'Pavilion 15', '16 GB RAM, 512 GB SSD', 'Electronics', 'Laptops', '2025-02', 62990, 74990),
  e('lenovo-ideapad-slim-5', 'Lenovo', 'IdeaPad Slim 5', '16 GB RAM, 512 GB SSD', 'Electronics', 'Laptops', '2025-04', 64990, 79990),
  e('asus-vivobook-s14', 'Asus', 'Vivobook S14', '16 GB RAM, 512 GB SSD', 'Electronics', 'Laptops', '2025-05', 69990, 84990),
  e('apple-ipad-air-m3-11', 'Apple', 'iPad Air M3 (11-inch)', '128 GB, Wi-Fi', 'Electronics', 'Tablets', '2025-03', 59900, 59900),
  e('apple-ipad-11th-gen', 'Apple', 'iPad (11th Gen)', '128 GB, Wi-Fi', 'Electronics', 'Tablets', '2025-03', 34900, 34900),
  e('samsung-galaxy-tab-s10-fe', 'Samsung', 'Galaxy Tab S10 FE', '8 GB + 128 GB, Wi-Fi', 'Electronics', 'Tablets', '2025-04', 34999, 44999),

  // ── TVs & gaming ──────────────────────────────────────────────────────
  e('lg-oled-c5-55', 'LG', 'OLED evo C5 55" 4K TV', '55 inch, 4K OLED', 'Electronics', 'TVs', '2025-04', 119990, 189990),
  e('sony-bravia-2-55', 'Sony', 'Bravia 2 55" 4K TV', '55 inch, 4K LED', 'Electronics', 'TVs', '2025-05', 59990, 84900),
  e('mi-tv-a-43', 'Xiaomi', 'Xiaomi TV A 43" Full HD', '43 inch, Full HD', 'Electronics', 'TVs', '2025-02', 21999, 32999),
  e('sony-playstation-5-slim', 'Sony', 'PlayStation 5 Slim', '1 TB, Disc Edition', 'Electronics', 'Gaming', '2023-11', 49990, 54990),
  e('nintendo-switch-2', 'Nintendo', 'Switch 2', '256 GB', 'Electronics', 'Gaming', '2025-06', 40990, 41990),

  // ── Headphones & earbuds ──────────────────────────────────────────────
  e('apple-airpods-pro-3', 'Apple', 'AirPods Pro 3', 'USB-C, MagSafe case', 'Accessories', 'Headphones', '2025-09', 24900, 24900),
  e('apple-airpods-pro-2', 'Apple', 'AirPods Pro (2nd Gen)', 'USB-C, MagSafe case', 'Accessories', 'Headphones', '2023-09', 20999, 24900),
  e('sony-wh-1000xm6', 'Sony', 'WH-1000XM6', 'Black, Over-Ear', 'Accessories', 'Headphones', '2025-05', 29990, 39990),
  e('sony-wh-ch520', 'Sony', 'WH-CH520', 'Beige, On-Ear', 'Accessories', 'Headphones', '2023-05', 4490, 5990),
  e('bose-quietcomfort-ultra', 'Bose', 'QuietComfort Ultra Headphones', 'Black', 'Accessories', 'Headphones', '2023-10', 31990, 39900),
  e('bose-quietcomfort-45', 'Bose', 'QuietComfort 45', 'Triple Black', 'Accessories', 'Headphones', '2022-09', 22990, 29900),
  e('sennheiser-momentum-4', 'Sennheiser', 'Momentum 4 Wireless', 'Black / Copper', 'Accessories', 'Headphones', '2022-08', 24990, 34990),
  e('jbl-live-660nc', 'JBL', 'Live 660NC', 'Blue, Over-Ear', 'Accessories', 'Headphones', '2022-04', 7999, 14999),
  e('boat-rockerz-450', 'boAt', 'Rockerz 450', 'Luscious Black, On-Ear', 'Accessories', 'Headphones', '2021-06', 1299, 3990),
  e('oneplus-buds-pro-3', 'OnePlus', 'OnePlus Buds Pro 3', 'Midnight Opus', 'Accessories', 'Headphones', '2024-06', 11999, 11999),
  e('realme-buds-air-6-pro', 'Realme', 'Buds Air 6 Pro', 'Bass Pro, ANC', 'Accessories', 'Headphones', '2024-07', 3999, 6999),
  e('nothing-ear-3', 'Nothing', 'Ear (3)', 'Black, ANC', 'Accessories', 'Headphones', '2025-09', 17999, 17999),

  // ── Appliances ────────────────────────────────────────────────────────
  e('dyson-v8-absolute', 'Dyson', 'V8 Absolute Cordless Vacuum', 'Silver / Nickel', 'Appliances', 'Vacuum Cleaners', '2019-06', 29900, 39900),
  e('lg-8kg-front-load-washer', 'LG', '8 Kg 5 Star Front Load Washing Machine', 'Middle Black', 'Appliances', 'Washing Machines', '2023-03', 34990, 46990),
  e('samsung-253l-double-door-fridge', 'Samsung', '253 L 3 Star Double Door Refrigerator', 'Elegant Inox', 'Appliances', 'Refrigerators', '2023-04', 24490, 31990),
  e('philips-air-fryer-hd9252', 'Philips', 'Air Fryer HD9252', '4.1 L, Black', 'Appliances', 'Air Fryers', '2023-05', 7995, 11995),
];

/** Category lookup that works for both the catalog and the seeded benchmarks. */
export function getProductMeta(productId: string): ProductMeta | undefined {
  const seeded = SEED_PRODUCT_META[productId];
  if (seeded) return seeded;
  const entry = CATALOG.find((c) => c.productId === productId);
  if (entry) {
    return { category: entry.category, subcategory: entry.subcategory, released: entry.released };
  }
  return undefined;
}

/**
 * Display category for a product. Falls back to the old name-based guess only for
 * products the catalog does not know about (e.g. data coming from a future live adapter).
 */
export function resolveCategory(productId: string): ProductCategory {
  const meta = getProductMeta(productId);
  if (meta) return meta.category;
  const id = productId.toLowerCase();
  if (/(headphone|earbud|buds|airpod|boat|wh-?\d)/.test(id)) return 'Accessories';
  if (/(fryer|vacuum|washer|washing|fridge|refrigerator|dyson|philips)/.test(id)) return 'Appliances';
  if (/(shoe|nike|fashion)/.test(id)) return 'Fashion';
  return 'Electronics';
}

// ── Deterministic sample-listing generator ──────────────────────────────

const PLATFORMS: PlatformName[] = [
  'Amazon',
  'Flipkart',
  'Croma',
  'Reliance Digital',
  'Tata CLiQ',
  'Vijay Sales',
];

/** Real search-results URL for each retailer (the old code pointed at the wrong domains). */
const SEARCH_URLS: Partial<Record<PlatformName, (q: string) => string>> = {
  Amazon: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  Flipkart: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  Croma: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}`,
  'Reliance Digital': (q) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(q)}`,
  'Tata CLiQ': (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}`,
  'Vijay Sales': (q) => `https://www.vijaysales.com/search/${encodeURIComponent(q)}`,
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function slugPlatform(platform: PlatformName): string {
  return platform.toLowerCase().replace(/\s+/g, '');
}

/** Builds the 6 per-retailer sample listings for one catalog product. Fully deterministic. */
export function listingsForEntry(entry: CatalogEntry): Listing[] {
  const h = hashString(entry.productId);
  const fullName = `${entry.brand} ${entry.model}`;
  const title = `${fullName} (${entry.variant})`;

  return PLATFORMS.map((platform, index) => {
    const varianceFactor = 1.0 + (((h + index * 17) % 11) - 5) * 0.01;
    const listedPrice = Math.round((entry.price * varianceFactor) / 10) * 10;
    const mrp = Math.max(entry.mrp, listedPrice);
    const discountPercent = Math.max(0, Math.round(((mrp - listedPrice) / mrp) * 100));

    const bankCardOffer = index % 3 === 0 ? Math.min(1500, Math.round(listedPrice * 0.03)) : 0;
    const searchUrl = SEARCH_URLS[platform]!;

    return {
      id: `${slugPlatform(platform)}-${entry.productId}`,
      productId: entry.productId,
      platform,
      title,
      brand: entry.brand,
      modelNumber: entry.model,
      variant: entry.variant,
      productUrl: searchUrl(fullName),
      listedPrice,
      mrp,
      discountPercent,
      deliveryCharge: index % 2 === 0 || listedPrice >= 20000 ? 0 : 49,
      convenienceFee: index === 1 ? 49 : 0,
      estimatedDeliveryDays: 1 + ((h + index) % 5),
      couponValue: (index * 250) % 1000,
      bankCardOffer,
      bankCardOfferLabel: bankCardOffer > 0 ? (index % 2 === 0 ? 'HDFC Bank Credit Card' : 'ICICI Bank Card') : '',
      exchangeOffer: 0,
      cashback: index === 0 ? 250 : 0,
      sellerName: `${platform} Authorized Partner Retail`,
      sellerRating: parseFloat((4.1 + ((h + index) % 9) / 10).toFixed(1)),
      numberOfRatings: 500 + ((h * 13 + index * 1000) % 25000),
      returnWindowDays: index % 2 === 0 ? 7 : 14,
      warrantyType: 'brand' as const,
    };
  });
}
