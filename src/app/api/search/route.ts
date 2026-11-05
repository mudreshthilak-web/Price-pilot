import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import { resolveCategory, getProductMeta } from '@/lib/catalog';
import {
  productDisplayName,
  searchProducts,
  SearchIndexItem,
  SearchSort,
} from '@/lib/search';

const SORTS: SearchSort[] = ['relevance', 'newest', 'price-asc', 'price-desc'];

/**
 * GET /api/search?q=phones
 *   &limit=8                      (omit for all matches)
 *   &sort=relevance|newest|price-asc|price-desc
 *   &brand=Apple,Samsung          (comma separated)
 *   &category=Electronics
 *   &maxPrice=50000               ("phones under 50000" in q works too)
 *
 * Response keeps the original `products[].{id,name,brand,category}` shape and adds
 * price / store count / release info, the total match count and brand facets.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    const limitParam = parseInt(searchParams.get('limit') || '', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : undefined;
    const sortParam = searchParams.get('sort') as SearchSort | null;
    const sort: SearchSort = sortParam && SORTS.includes(sortParam) ? sortParam : 'relevance';
    const brands = (searchParams.get('brand') || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    const category = searchParams.get('category') || undefined;
    const maxPriceParam = parseInt(searchParams.get('maxPrice') || '', 10);
    const maxPrice = Number.isFinite(maxPriceParam) && maxPriceParam > 0 ? maxPriceParam : undefined;

    if (query.length < 2 && !maxPrice) {
      return NextResponse.json({ products: [], total: 0, brands: [], query });
    }

    const adapter = getAdapter();
    const options = { limit, sort, brands, category, maxPrice };

    let items: SearchIndexItem[];
    let total: number;
    let facets: { brand: string; count: number }[];
    let parsedMaxPrice: number | undefined;

    if (adapter.searchCatalog) {
      const result = adapter.searchCatalog(query, options);
      ({ items, total, brands: facets, parsedMaxPrice } = result);
    } else {
      // Adapters without their own ranking: group whatever listings they return.
      const listings = await adapter.fetchListings(query);
      const grouped = new Map<string, SearchIndexItem>();
      for (const l of listings) {
        const existing = grouped.get(l.productId);
        if (existing) {
          existing.lowestPrice = Math.min(existing.lowestPrice, l.listedPrice);
          existing.storeCount += 1;
          continue;
        }
        const meta = getProductMeta(l.productId);
        grouped.set(l.productId, {
          productId: l.productId,
          brand: l.brand,
          model: l.modelNumber,
          variant: l.variant,
          category: resolveCategory(l.productId),
          subcategory: meta?.subcategory ?? '',
          released: meta?.released ?? '2020-01',
          lowestPrice: l.listedPrice,
          storeCount: 1,
        });
      }
      const result = searchProducts(Array.from(grouped.values()), query, options);
      ({ items, total, brands: facets, parsedMaxPrice } = result);
    }

    return NextResponse.json({
      query,
      total,
      brands: facets,
      parsedMaxPrice,
      products: items.map((i) => ({
        id: i.productId,
        name: productDisplayName(i.brand, i.model, i.variant),
        brand: i.brand,
        category: i.category,
        subcategory: i.subcategory,
        variant: i.variant,
        released: i.released,
        lowestPrice: i.lowestPrice,
        storeCount: i.storeCount,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
