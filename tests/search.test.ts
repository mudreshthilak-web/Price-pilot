import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../src/lib/adapters/mock-adapter';
import { CATALOG } from '../src/lib/catalog';
import { parseBudget, productDisplayName, isRecentRelease } from '../src/lib/search';

const adapter = new MockAdapter();
const names = (q: string, opts = {}) =>
  adapter.searchCatalog(q, opts).items.map((i) => `${i.brand} ${i.model}`);

describe('Search: the reported bugs', () => {
  it('"iphone" returns every iPhone generation, newest first, not just iPhone 15', async () => {
    const res = names('iphone');
    expect(res).toContain('Apple iPhone 18 Pro');
    expect(res).toContain('Apple iPhone 17');
    expect(res).toContain('Apple iPhone 17e');
    expect(res).toContain('Apple iPhone Air');
    expect(res).toContain('Apple iPhone 16');
    expect(res).toContain('Apple iPhone 15');
    expect(res.every((n) => n.startsWith('Apple'))).toBe(true);
    expect(res.indexOf('Apple iPhone 18 Pro')).toBeLessThan(res.indexOf('Apple iPhone 16'));
    expect(res.indexOf('Apple iPhone 16')).toBeLessThan(res.indexOf('Apple iPhone 15'));
  });

  it('"phones" returns real phones from many brands, never a "Generic" product', () => {
    const { items, total } = adapter.searchCatalog('phones');
    const brands = new Set(items.map((i) => i.brand));
    expect(total).toBeGreaterThan(10);
    for (const b of ['Apple', 'Samsung', 'Google', 'OnePlus']) expect(brands.has(b)).toBe(true);
    expect(items.every((i) => i.subcategory === 'Smartphones')).toBe(true);
    expect(items.some((i) => /generic|audiotech/i.test(i.brand))).toBe(false);
  });

  it('the first page of "phones" is a mix of brands, not ten of one brand', () => {
    const first8 = adapter.searchCatalog('phones', { limit: 8 }).items;
    expect(new Set(first8.map((i) => i.brand)).size).toBeGreaterThanOrEqual(4);
  });

  it('headphone queries do not return phones and phone queries do not return headphones', () => {
    expect(adapter.searchCatalog('phone').items.some((i) => i.subcategory === 'Headphones')).toBe(false);
    expect(adapter.searchCatalog('headphones').items.every((i) => i.subcategory === 'Headphones')).toBe(true);
  });
});

describe('Search: matching behaviour', () => {
  it('all words must match: "samsung phones" is only Samsung phones', () => {
    const { items } = adapter.searchCatalog('samsung phones');
    expect(items.length).toBeGreaterThan(3);
    expect(items.every((i) => i.brand === 'Samsung' && i.subcategory === 'Smartphones')).toBe(true);
  });

  it('model numbers do not prefix-match storage sizes ("iphone 12" must not hit "128 GB")', () => {
    expect(names('iphone 12')).toEqual([]);
  });

  it('"iphone 17" finds the 17 family', () => {
    const res = names('iphone 17');
    expect(res).toContain('Apple iPhone 17');
    expect(res).toContain('Apple iPhone 17 Pro');
    expect(res).toContain('Apple iPhone 17e');
    expect(res).not.toContain('Apple iPhone 16');
  });

  it('tolerates typos and run-together input', () => {
    expect(names('iphne')).toContain('Apple iPhone 17');
    expect(names('samsng')).toContain('Samsung Galaxy S26');
    expect(names('wh1000xm5')).toContain('Sony WH-1000XM5');
    expect(names('iphone15')).toContain('Apple iPhone 15');
    expect(names('s26 ultra')).toEqual(['Samsung Galaxy S26 Ultra']);
  });

  it('category chips on the home page still return something useful', () => {
    for (const q of ['electronics', 'appliances', 'accessories']) {
      const { total, items } = adapter.searchCatalog(q);
      expect(total).toBeGreaterThan(3);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it('returns nothing for gibberish instead of inventing a product', async () => {
    expect(adapter.searchCatalog('xyzzyplugh').total).toBe(0);
    expect(await adapter.fetchListings('xyzzyplugh')).toEqual([]);
  });

  it('does not list iPhone 15 more than once', () => {
    const res = adapter.searchCatalog('iphone 15').items;
    const keys = res.map((i) => i.productId);
    expect(new Set(keys).size).toBe(keys.length);
    // 128 GB and 256 GB stay distinct, with distinguishable display names.
    const display = res.map((i) => productDisplayName(i.brand, i.model, i.variant));
    expect(new Set(display).size).toBe(display.length);
  });
});

describe('Search: budget, sort and filters', () => {
  it('parses budgets in several spellings', () => {
    expect(parseBudget('phones under 50000').maxPrice).toBe(50000);
    expect(parseBudget('laptop below ₹60k').maxPrice).toBe(60000);
    expect(parseBudget('tv less than 1.5 lakh').maxPrice).toBe(150000);
    expect(parseBudget('phones under 50,000').text).toBe('phones');
    expect(parseBudget('iphone 15').maxPrice).toBeUndefined();
  });

  it('"phones under 50000" only returns phones whose lowest price is within budget', () => {
    const r = adapter.searchCatalog('phones under 50000');
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((i) => i.lowestPrice <= 50000 && i.subcategory === 'Smartphones')).toBe(true);
    expect(r.parsedMaxPrice).toBe(50000);
  });

  it('sorts by price and by newest', () => {
    const asc = adapter.searchCatalog('phones', { sort: 'price-asc' }).items.map((i) => i.lowestPrice);
    expect([...asc].sort((a, b) => a - b)).toEqual(asc);
    const newest = adapter.searchCatalog('phones', { sort: 'newest' }).items.map((i) => i.released);
    expect([...newest].sort().reverse()).toEqual(newest);
  });

  it('brand filter narrows results while facets still list every brand', () => {
    const r = adapter.searchCatalog('phones', { brands: ['Samsung'] });
    expect(r.items.every((i) => i.brand === 'Samsung')).toBe(true);
    expect(r.brands.map((b) => b.brand)).toContain('Apple');
  });
});

describe('Catalog integrity', () => {
  it('has no duplicate product ids and no placeholder brands', () => {
    const ids = CATALOG.map((c) => c.productId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CATALOG.some((c) => /generic|audiotech/i.test(c.brand))).toBe(false);
  });

  it('every product has listings from multiple stores with sane prices', async () => {
    const all = await adapter.fetchAllListings();
    for (const c of CATALOG) {
      const ls = all.filter((l) => l.productId === c.productId);
      expect(ls.length).toBeGreaterThanOrEqual(4);
      for (const l of ls) {
        expect(l.listedPrice).toBeGreaterThan(0);
        expect(l.mrp).toBeGreaterThanOrEqual(l.listedPrice);
      }
    }
  });

  it('listing ids are unique across the whole catalog', async () => {
    const all = await adapter.fetchAllListings();
    const ids = all.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Helpers', () => {
  it('productDisplayName does not repeat the brand', () => {
    expect(productDisplayName('Samsung', 'Galaxy S26', '12 GB + 256 GB')).toBe('Samsung Galaxy S26 (12 GB + 256 GB)');
    expect(productDisplayName('Apple', 'Apple Watch')).toBe('Apple Watch');
  });

  it('isRecentRelease flags only recent launches', () => {
    const now = new Date('2026-11-04T00:00:00Z');
    expect(isRecentRelease('2026-09', now)).toBe(true);
    expect(isRecentRelease('2025-01', now)).toBe(false);
  });
});
