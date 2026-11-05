import { NextRequest, NextResponse } from 'next/server';
import { PriceAlert } from '@/lib/types';

// In-memory alert store for mock/development environment
let alerts: PriceAlert[] = [
  {
    id: 'alert-1',
    productId: 'sony-wh1000xm5',
    productName: 'Sony WH-1000XM5 Headphones',
    targetPrice: 25000,
    currentBestPrice: 25490,
    isTriggered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    productId: 'iphone-15-128gb',
    productName: 'Apple iPhone 15 (128 GB)',
    targetPrice: 63000,
    currentBestPrice: 62499,
    isTriggered: true,
    triggeredAt: new Date().toISOString(),
    platform: 'Flipkart',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      productId: body.productId,
      productName: body.productName || 'Tracked Product',
      targetPrice: Number(body.targetPrice),
      currentBestPrice: Number(body.currentBestPrice || body.targetPrice),
      isTriggered: Number(body.currentBestPrice) <= Number(body.targetPrice),
      triggeredAt: Number(body.currentBestPrice) <= Number(body.targetPrice) ? new Date().toISOString() : undefined,
      platform: body.platform,
      createdAt: new Date().toISOString(),
    };

    alerts.unshift(newAlert);
    return NextResponse.json({ alert: newAlert, success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create alert';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      alerts = alerts.filter((a) => a.id !== id);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete alert';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
