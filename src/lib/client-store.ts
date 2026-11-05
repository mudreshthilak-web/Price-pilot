/**
 * Per-browser storage for alerts, preferences and the last search.
 *
 * Why this exists: alerts used to live in a module-level array inside an API route, and the
 * Preferences page kept its choices only in React state. On a serverless host (Netlify) the
 * route's memory is not shared between requests and is wiped on every cold start, and when it
 * does stick it is one list shared by every visitor. Preferences were never saved or used at
 * all. Storing these in the visitor's own browser fixes both without needing a database or login.
 *
 * All functions are safe to call during SSR (they return null/no-op) and when storage is
 * unavailable (private mode, blocked cookies).
 */
import type { PriceAlert } from './types';

export const PREFS_KEY = 'pricepilot:preferences:v1';
export const ALERTS_KEY = 'pricepilot:alerts:v1';
export const LAST_SEARCH_KEY = 'pricepilot:last-search';

export type DeliveryUrgency = 'standard' | 'fast' | 'express';

export interface StoredPreferences {
  cards: string[];
  platforms: string[];
  deliveryUrgency: DeliveryUrgency;
  useCustomWeights: boolean;
}

export const ALL_PLATFORMS = [
  'Amazon',
  'Flipkart',
  'Croma',
  'Reliance Digital',
  'Tata CLiQ',
  'Myntra',
  'Vijay Sales',
  'Meesho',
];

export const DEFAULT_PREFERENCES: StoredPreferences = {
  cards: ['HDFC', 'Axis'],
  platforms: ALL_PLATFORMS,
  deliveryUrgency: 'standard',
  useCustomWeights: false,
};

function read(storage: 'local' | 'session', key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: 'local' | 'session', key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* storage unavailable: features degrade to "not remembered", never crash */
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Returns what the visitor explicitly saved, or null if they never saved preferences. */
export function loadPreferences(): StoredPreferences | null {
  const raw = read('local', PREFS_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      cards: isStringArray(p.cards) ? p.cards : DEFAULT_PREFERENCES.cards,
      platforms: isStringArray(p.platforms) ? p.platforms : DEFAULT_PREFERENCES.platforms,
      deliveryUrgency:
        p.deliveryUrgency === 'fast' || p.deliveryUrgency === 'express' ? p.deliveryUrgency : 'standard',
      useCustomWeights: p.useCustomWeights === true,
    };
  } catch {
    return null;
  }
}

export function savePreferences(p: StoredPreferences): void {
  write('local', PREFS_KEY, JSON.stringify(p));
}

/** Delivery-speed weight for each urgency. 0.15 is the engine's default. */
export const SPEED_WEIGHT: Record<DeliveryUrgency, number> = {
  standard: 0.15,
  fast: 0.25,
  express: 0.35,
};

/**
 * Query string for /api/products/:id/compare. Only includes what actually differs from the
 * default behaviour, so a visitor who never saved preferences gets exactly the old results.
 */
export function preferenceQuery(p: StoredPreferences | null): string {
  if (!p) return '';
  const qs = new URLSearchParams();
  if (p.cards.length > 0) qs.set('cards', p.cards.join(','));
  if (p.platforms.length > 0 && p.platforms.length < ALL_PLATFORMS.length) {
    qs.set('platforms', p.platforms.join(','));
  }
  if (p.useCustomWeights && p.deliveryUrgency !== 'standard') {
    qs.set('speed', String(SPEED_WEIGHT[p.deliveryUrgency]));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ── Alerts ──────────────────────────────────────────────────────────────

/** The two demo alerts the page always showed, so a first visit looks exactly as before. */
export function defaultAlerts(now: Date = new Date()): PriceAlert[] {
  return [
    {
      id: 'alert-1',
      productId: 'sony-wh1000xm5',
      productName: 'Sony WH-1000XM5 Headphones',
      targetPrice: 25000,
      currentBestPrice: 25490,
      isTriggered: false,
      createdAt: now.toISOString(),
    },
    {
      id: 'alert-2',
      productId: 'iphone-15-128gb',
      productName: 'Apple iPhone 15 (128 GB)',
      targetPrice: 63000,
      currentBestPrice: 62499,
      isTriggered: true,
      triggeredAt: now.toISOString(),
      platform: 'Flipkart',
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
    },
  ];
}

export function loadAlerts(): PriceAlert[] {
  const raw = read('local', ALERTS_KEY);
  if (!raw) return defaultAlerts();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultAlerts();
    return parsed.filter(
      (a): a is PriceAlert =>
        a && typeof a.id === 'string' && typeof a.productId === 'string' && Number.isFinite(a.targetPrice)
    );
  } catch {
    return defaultAlerts();
  }
}

export function saveAlerts(alerts: PriceAlert[]): void {
  write('local', ALERTS_KEY, JSON.stringify(alerts));
}

/**
 * Re-evaluates an alert against the latest best price. "Triggered" used to be decided once, at
 * creation, and never again, so an alert could never fire later.
 */
export function evaluateAlert(
  alert: PriceAlert,
  best: { price: number; platform?: PriceAlert['platform'] },
  now: Date = new Date()
): PriceAlert {
  const isTriggered = best.price <= alert.targetPrice;
  return {
    ...alert,
    currentBestPrice: best.price,
    platform: isTriggered ? best.platform ?? alert.platform : alert.platform,
    isTriggered,
    triggeredAt: isTriggered ? alert.triggeredAt ?? now.toISOString() : undefined,
  };
}

/**
 * Adds an alert, or updates the existing one for the same product (no more duplicates when
 * "Set Price Alert" is pressed twice).
 */
export function upsertAlert(alerts: PriceAlert[], next: PriceAlert): PriceAlert[] {
  const without = alerts.filter((a) => a.productId !== next.productId);
  return [next, ...without];
}

/** Default target for the one-click "Set Price Alert": 5% under today's best price. */
export function suggestedTarget(currentBest: number): number {
  return Math.max(1, Math.floor((currentBest * 0.95) / 100) * 100);
}

// ── Last search (so "Back to Search" returns to the results you came from) ──

export function setLastSearch(q: string): void {
  write('session', LAST_SEARCH_KEY, q);
}

export function subscribeNever(): () => void {
  return () => {};
}

export function getLastSearchSnapshot(): string | null {
  return read('session', LAST_SEARCH_KEY);
}
