import { NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import { computeBasket } from '@/lib/basket';

/**
 * Basket Savings API.
 * Aggregates the five benchmark products (iPhone 15 128 GB, Sony WH-1000XM5, Samsung 43" Crystal
 * 4K TV, boAt Airdopes 141, Philips Air Fryer HD9200). Every total is computed from the
 * per-product rows. They used to be hard-coded constants (124982 / 130398 / 135468 and a 14.4%
 * spread) that disagreed with the rows shown beneath them.
 */
export async function GET() {
  try {
    const adapter = getAdapter();
    const allListings = await adapter.fetchAllListings();
    return NextResponse.json(computeBasket(allListings));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate basket';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
