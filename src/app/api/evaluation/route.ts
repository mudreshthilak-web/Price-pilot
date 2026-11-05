import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdapter } from '@/lib/adapters';
import { computeBasket } from '@/lib/basket';
import { measureEngineLatency, measureMatchAccuracy } from '@/lib/evaluation';
import { formatINR } from '@/lib/utils';

interface VitestReport {
  success?: boolean;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  startTime?: number;
}

/**
 * Evaluation telemetry. Everything shown here is either measured on this request (matching
 * accuracy, engine latency, basket savings), read from the Vitest report (test counts), or
 * explicitly labelled "Not yet measured". It used to return hard-coded accuracy percentages
 * (98.4% / 99.8% / 96.5%) tagged "measured", and a fallback of "7/7 tests" when no report existed.
 */
export async function GET() {
  try {
    let report: VitestReport | null = null;
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), 'test-results.json'), 'utf8');
      report = JSON.parse(raw) as VitestReport;
    } catch {
      report = null; // no report in this deployment: say so rather than inventing counts
    }

    const adapter = getAdapter();
    const listings = await adapter.fetchAllListings();
    const match = measureMatchAccuracy(listings);
    const latencyMs = measureEngineLatency(listings);
    const basket = computeBasket(listings);

    const testsAvailable = report !== null && typeof report.numTotalTests === 'number';
    const passed = report?.numPassedTests ?? 0;
    const total = report?.numTotalTests ?? 0;

    const notMeasured = (title: string, description: string) => ({
      title,
      value: 'Not yet measured',
      status: 'placeholder',
      type: 'placeholder',
      description,
    });

    return NextResponse.json({
      metrics: [
        {
          title: 'Product Match Accuracy',
          value: `${match.percent.toFixed(1)}%`,
          status: 'active',
          type: 'measured',
          testSource: `Variant separation: ${match.correct}/${match.total} same-brand product pairs kept apart`,
          description: `Share of same-brand product pairs (different model or variant) the matcher never merged into one group. ${
            match.splitProducts.length > 0
              ? `Known gap: for ${match.splitProducts.length} products, differently worded retailer titles fall under the similarity threshold and split into several groups.`
              : ''
          }`.trim(),
        },
        notMeasured(
          'Price Accuracy',
          'Needs independent ground-truth retailer prices to compare against. Sample data has none; this becomes measurable with the live adapter.'
        ),
        notMeasured(
          'Recommendation Accuracy',
          'Needs labelled "best deal" outcomes to score against. Not available for sample data.'
        ),
        {
          title: 'Data Freshness',
          value: 'Sample data',
          status: 'placeholder',
          type: 'placeholder',
          description:
            'Prices come from a deterministic sample generator, so freshness is not measured. With the live adapter this will report the age of the latest retailer fetch.',
        },
        {
          title: 'Engine Response Time',
          value: latencyMs < 1 ? `${latencyMs.toFixed(2)} ms` : `${latencyMs.toFixed(1)} ms`,
          status: 'active',
          type: 'measured',
          testSource: 'Measured just now: full 4-engine pipeline per product',
          description: 'Average in-process time to match, price, trend-analyse, trust-score and deal-score one product’s listings.',
        },
        {
          title: 'User Basket Savings',
          value: `${formatINR(basket.savingsVsHighest)} (${basket.savingsPercentVsHighest}%)`,
          status: 'active',
          type: 'measured',
          testSource: `Benchmark basket, computed (avg spread: ${basket.averageSpreadPercent}%)`,
          description: 'Savings on the benchmark basket from buying each item at its cheapest store versus its priciest.',
        },
      ],
      testSummary: {
        available: testsAvailable,
        numTotalTests: testsAvailable ? total : null,
        numPassedTests: testsAvailable ? passed : null,
        numFailedTests: testsAvailable ? report?.numFailedTests ?? total - passed : null,
        success: testsAvailable ? report?.success === true && passed === total : null,
        timestamp: report?.startTime ? new Date(report.startTime).toISOString() : null,
      },
      latencyMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch evaluation telemetry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
