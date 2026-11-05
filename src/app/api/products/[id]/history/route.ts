import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adapter = getAdapter();
    const allListings = await adapter.fetchAllListings();

    const productListings = allListings.filter((l) => l.productId === id);
    if (productListings.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const historiesByPlatform: Record<string, { date: string; price: number }[]> = {};

    for (const listing of productListings) {
      const history = await adapter.fetchPriceHistory(listing.id);
      historiesByPlatform[listing.platform] = history.map((h) => ({
        date: h.date,
        price: h.price,
      }));
    }

    return NextResponse.json({
      productId: id,
      histories: historiesByPlatform,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
