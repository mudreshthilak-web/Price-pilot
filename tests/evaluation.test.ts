import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../src/lib/adapters/mock-adapter';
import { measureMatchAccuracy, measureEngineLatency } from '../src/lib/evaluation';
import { computeBasket } from '../src/lib/basket';

const adapter = new MockAdapter();

describe('Measured metrics (what the dashboard reports)', () => {
  it('product matching: reports real accuracy and its failures', async () => {
    const r = measureMatchAccuracy(await adapter.fetchAllListings());
    console.log('MATCH', r.correct, '/', r.total, r.percent.toFixed(2) + '%', 'merged:', r.merged, 'split:', r.splitProducts);
    expect(r.total).toBeGreaterThan(100);
  });

  it('basket totals add up to their rows', async () => {
    const b = computeBasket(await adapter.fetchAllListings());
    expect(b.items.length).toBe(5);
    expect(b.totalLowest).toBe(b.items.reduce((s, i) => s + i.lowestPrice, 0));
    expect(b.totalHighest).toBe(b.items.reduce((s, i) => s + i.highestPrice, 0));
    expect(b.savingsVsHighest).toBe(b.totalHighest - b.totalLowest);
    expect(b.totalLowest).toBeLessThanOrEqual(b.totalAverage);
    expect(b.totalAverage).toBeLessThanOrEqual(b.totalHighest);
  });

  it('latency is a finite positive number', async () => {
    const ms = measureEngineLatency(await adapter.fetchAllListings());
    console.log('LATENCY ms/product', ms.toFixed(3));
    expect(ms).toBeGreaterThan(0);
    expect(Number.isFinite(ms)).toBe(true);
  });
});
