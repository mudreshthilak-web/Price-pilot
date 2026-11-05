/**
 * Product search for Price Pilot.
 *
 * Fixes the old behaviour where the whole query had to appear as a substring of a title
 * (so "iphone" could only ever hit the six seeded products, and anything unknown was
 * fabricated as a "Generic" product). This engine:
 *  - tokenises the query and requires every token to match (AND), so "samsung phones" works
 *  - understands category words ("phone", "mobile", "laptop", "tv", "earbuds"...)
 *  - tolerates typos ("iphne", "samsng") and spacing ("wh1000xm5", "iphone15")
 *  - understands budgets ("phones under 50000", "laptop below 60k")
 *  - returns newest models first within a brand and mixes brands for broad queries
 *  - returns nothing (honestly) when nothing matches, rather than inventing a product
 */

export interface SearchIndexItem {
  productId: string;
  brand: string;
  model: string;
  variant: string;
  category: string;
  subcategory: string;
  /** YYYY-MM */
  released: string;
  lowestPrice: number;
  storeCount: number;
}

export type SearchSort = 'relevance' | 'newest' | 'price-asc' | 'price-desc';

export interface SearchOptions {
  limit?: number;
  sort?: SearchSort;
  /** Restrict to these brands (case-insensitive). */
  brands?: string[];
  /** Restrict to this display category (Electronics / Accessories / ...). */
  category?: string;
  maxPrice?: number;
}

export interface BrandFacet {
  brand: string;
  count: number;
}

export interface SearchResult {
  items: SearchIndexItem[];
  /** Total matches before `limit` is applied. */
  total: number;
  /** Brand facets computed on the matches *before* the brand filter, for building filters. */
  brands: BrandFacet[];
  /** Budget parsed out of the query text, if any. */
  parsedMaxPrice?: number;
}

/** Words people type for a category -> the subcategory / category they mean. */
const CATEGORY_TERMS: Record<string, string[]> = {
  Smartphones: ['phone', 'phones', 'smartphone', 'smartphones', 'mobile', 'mobiles', 'cellphone', 'cellphones', 'android', '5g'],
  Laptops: ['laptop', 'laptops', 'notebook', 'notebooks'],
  Tablets: ['tablet', 'tablets', 'tab', 'tabs'],
  TVs: ['tv', 'tvs', 'television', 'televisions'],
  Gaming: ['gaming', 'console', 'consoles', 'game'],
  Headphones: ['headphone', 'headphones', 'earphone', 'earphones', 'earbud', 'earbuds', 'buds', 'audio', 'headset', 'tws', 'wireless'],
  'Air Fryers': ['fryer', 'fryers', 'airfryer', 'airfryers', 'kitchen'],
  'Vacuum Cleaners': ['vacuum', 'vacuums', 'cleaner', 'cleaners'],
  'Washing Machines': ['washer', 'washers', 'washing', 'laundry'],
  Refrigerators: ['fridge', 'fridges', 'refrigerator', 'refrigerators'],
};

const TOP_LEVEL_TERMS: Record<string, string[]> = {
  Electronics: ['electronics', 'electronic', 'gadget', 'gadgets'],
  Accessories: ['accessories', 'accessory'],
  Appliances: ['appliances', 'appliance', 'home'],
  Fashion: ['fashion', 'clothing', 'shoes'],
};

const STOPWORDS = new Set(['a', 'an', 'the', 'for', 'and', 'with', 'in', 'of', 'to', 'best', 'new', 'latest', 'buy', 'price', 'prices', 'cheap', 'cheapest']);

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Pulls a budget out of the query: "under 50000", "below ₹60k", "less than 1.5 lakh", "<30000".
 * Returns the cleaned query plus the parsed ceiling.
 */
export function parseBudget(raw: string): { text: string; maxPrice?: number } {
  const re = /(?:under|below|less than|upto|up to|within|max|<=?)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|l|lac|lakh|lakhs)?/i;
  const m = raw.match(re);
  if (!m) return { text: raw };
  let value = parseFloat(m[1].replace(/,/g, ''));
  if (Number.isNaN(value)) return { text: raw };
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') value *= 1000;
  else if (unit) value *= 100000;
  // "under 5" is almost certainly not a ₹5 budget; ignore tiny numbers without a unit.
  if (value < 100) return { text: raw };
  return { text: raw.replace(m[0], ' ').replace(/\s+/g, ' ').trim(), maxPrice: Math.round(value) };
}

interface PreparedItem {
  item: SearchIndexItem;
  words: string[];
  compact: string;
  brandWords: string[];
}

function prepare(item: SearchIndexItem): PreparedItem {
  const subTerms = CATEGORY_TERMS[item.subcategory] || [];
  const topTerms = TOP_LEVEL_TERMS[item.category] || [];
  const w = [
    ...words(item.brand),
    ...words(item.model),
    ...words(item.variant),
    ...words(item.subcategory),
    ...subTerms,
    ...topTerms,
  ];
  return {
    item,
    words: Array.from(new Set(w)),
    compact: compact(`${item.brand}${item.model}${item.variant}`),
    brandWords: words(item.brand),
  };
}

const isNumeric = (t: string) => /^\d+$/.test(t);

/** How well a token matches a product: 0 = no match, higher is better. */
function tokenScore(token: string, p: PreparedItem): number {
  for (const w of p.words) {
    if (w === token) return 3;
  }
  if (isNumeric(token)) {
    // Numbers must not prefix-match other numbers ("12" must not hit "128 GB"),
    // but may be followed by letters: "17" -> "17e", "1000" -> "1000xm5".
    for (const w of p.words) {
      if (w.startsWith(token) && /^[a-z]+$/.test(w.slice(token.length))) return 2;
    }
    return 0;
  }
  // A word the token is a prefix of ("sam" -> "samsung").
  for (const w of p.words) {
    if (w.startsWith(token)) return 2;
  }
  // Run-together input containing digits: "iphone15", "wh1000xm5", "s26ultra", "256gb".
  if (token.length >= 3 && /\d/.test(token) && p.compact.includes(token)) return 1.5;
  // Typos, alphabetic tokens only (so "15" never fuzzily becomes "16").
  if (token.length >= 4 && !isNumeric(token) && !/\d/.test(token)) {
    const allowed = token.length >= 8 ? 2 : 1;
    for (const w of p.words) {
      if (w.length < 3 || /\d/.test(w)) continue;
      // Typos almost never change the first letter. Without this, "iphone" fuzzy-matched
      // the word "phone" (one deletion away) and pulled in every smartphone brand.
      if (w[0] !== token[0]) continue;
      if (levenshtein(token, w.slice(0, token.length)) <= allowed || levenshtein(token, w) <= allowed) return 1;
    }
  }
  return 0;
}

function brandOf(p: PreparedItem, tokens: string[]): boolean {
  return tokens.some((t) => p.brandWords.some((b) => b === t || b.startsWith(t)));
}

/** Round-robin across brands (each brand's best first) so broad queries show variety. */
function diversify<T extends { brand: string }>(sorted: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const it of sorted) {
    const key = it.brand.toLowerCase();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(it);
  }
  const queues = Array.from(buckets.values());
  const out: T[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        progressed = true;
      }
    }
  }
  return out;
}

export function searchProducts(
  index: SearchIndexItem[],
  rawQuery: string,
  options: SearchOptions = {}
): SearchResult {
  const { limit, sort = 'relevance', brands, category } = options;
  const budget = parseBudget(rawQuery.trim());
  const maxPrice = options.maxPrice ?? budget.maxPrice;
  const tokens = words(budget.text).filter((t) => !STOPWORDS.has(t));

  const prepared = index.map(prepare);

  // No text left (e.g. just "under 50000") -> treat as "everything within budget".
  const scored = prepared
    .map((p) => {
      if (tokens.length === 0) return { p, score: budget.maxPrice !== undefined || options.maxPrice !== undefined ? 1 : 0 };
      let total = 0;
      for (const t of tokens) {
        const s = tokenScore(t, p);
        if (s === 0) return { p, score: 0 };
        total += s;
      }
      // Reward queries that name the brand outright.
      if (brandOf(p, tokens)) total += 1;
      return { p, score: total };
    })
    .filter((r) => r.score > 0);

  // Facets are computed before brand / category / budget filters so the UI can show
  // the full set of choices the person can still pick from.
  const facetSource = scored.filter((r) => maxPrice === undefined || r.p.item.lowestPrice <= maxPrice);
  const facetMap = new Map<string, number>();
  for (const r of facetSource) {
    if (category && r.p.item.category.toLowerCase() !== category.toLowerCase()) continue;
    facetMap.set(r.p.item.brand, (facetMap.get(r.p.item.brand) || 0) + 1);
  }
  const brandFacets: BrandFacet[] = Array.from(facetMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));

  const brandSet = brands && brands.length ? new Set(brands.map((b) => b.toLowerCase())) : null;

  let filtered = scored.filter((r) => {
    if (maxPrice !== undefined && r.p.item.lowestPrice > maxPrice) return false;
    if (category && r.p.item.category.toLowerCase() !== category.toLowerCase()) return false;
    if (brandSet && !brandSet.has(r.p.item.brand.toLowerCase())) return false;
    return true;
  });

  // Best relevance first; ties broken by newest release, then lower price.
  filtered = filtered.sort(
    (a, b) =>
      b.score - a.score ||
      b.p.item.released.localeCompare(a.p.item.released) ||
      a.p.item.lowestPrice - b.p.item.lowestPrice
  );

  let items = filtered.map((r) => r.p.item);

  if (sort === 'newest') {
    items = [...items].sort((a, b) => b.released.localeCompare(a.released) || a.lowestPrice - b.lowestPrice);
  } else if (sort === 'price-asc') {
    items = [...items].sort((a, b) => a.lowestPrice - b.lowestPrice);
  } else if (sort === 'price-desc') {
    items = [...items].sort((a, b) => b.lowestPrice - a.lowestPrice);
  } else {
    // Relevance: within the top score tier keep newest-first per brand, but mix brands
    // so "phones" shows Apple, Samsung, Google, OnePlus... instead of ten of one brand.
    const distinctBrands = new Set(items.map((i) => i.brand.toLowerCase()));
    if (distinctBrands.size > 1) {
      const top = filtered.length ? filtered[0].score : 0;
      const tier = filtered.filter((r) => r.score === top).map((r) => r.p.item);
      const rest = filtered.filter((r) => r.score !== top).map((r) => r.p.item);
      items = [...diversify(tier), ...diversify(rest)];
    }
  }

  const total = items.length;
  if (limit !== undefined) items = items.slice(0, limit);

  return { items, total, brands: brandFacets, parsedMaxPrice: budget.maxPrice };
}

/** "Apple iPhone 17 (256 GB)" — brand is not repeated if the model already starts with it. */
export function productDisplayName(brand: string, model: string, variant?: string): string {
  const base = model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
  return variant ? `${base} (${variant})` : base;
}

/** True when a YYYY-MM release is within the last `months` months. */
export function isRecentRelease(released: string, now: Date = new Date(), months = 8): boolean {
  const [y, m] = released.split('-').map(Number);
  if (!y || !m) return false;
  const diff = (now.getUTCFullYear() - y) * 12 + (now.getUTCMonth() + 1 - m);
  return diff >= 0 && diff <= months;
}
