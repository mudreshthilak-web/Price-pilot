"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import Link from "next/link"
import { Bell, CheckCircle2, Clock, Trash2, Plus, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/utils"
import type { ComparisonResult, PriceAlert } from "@/lib/types"
import {
  evaluateAlert,
  loadAlerts,
  loadPreferences,
  preferenceQuery,
  saveAlerts,
  subscribeNever,
  upsertAlert,
} from "@/lib/client-store"

const PRODUCT_OPTIONS = [
  { id: "sony-wh1000xm5", label: "Sony WH-1000XM5 Headphones" },
  { id: "iphone-15-128gb", label: "Apple iPhone 15 (128 GB)" },
  { id: "samsung-43-crystal-4k", label: 'Samsung 43" Crystal 4K TV' },
  { id: "boat-airdopes-141", label: "boAt Airdopes 141 Earbuds" },
  { id: "philips-air-fryer-hd9200", label: "Philips Air Fryer HD9200" },
]

/** Lowest effective price right now (ignoring listings the engine flags as untrustworthy). */
async function fetchBest(productId: string, query: string) {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}/compare${query}`)
    if (!res.ok) return null
    const d: ComparisonResult = await res.json()
    const trusted = d.listings.filter((l) => !l.dealScore.isExcluded)
    const pool = trusted.length > 0 ? trusted : d.listings
    if (pool.length === 0) return null
    const best = pool.reduce((a, b) => (b.effectivePrice.effectivePrice < a.effectivePrice.effectivePrice ? b : a))
    return { price: best.effectivePrice.effectivePrice, platform: best.listing.platform }
  } catch {
    return null
  }
}


/**
 * Alerts are stored in the visitor's own browser (see lib/client-store.ts). They used to live in
 * server memory, which on a serverless host is wiped between requests and shared by everyone.
 * The page renders with the default alerts on the server, then remounts with the saved ones.
 */
export default function AlertsPage() {
  const inBrowser = useSyncExternalStore(subscribeNever, () => true, () => false)
  return <AlertsView key={inBrowser ? "browser" : "server"} initial={inBrowser ? loadAlerts() : []} persist={inBrowser} />
}

function AlertsView({ initial, persist }: { initial: PriceAlert[]; persist: boolean }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(initial)
  const loading = false
  const [newTarget, setNewTarget] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("sony-wh1000xm5")
  const [error, setError] = useState<string | null>(null)

  // Persist every change, but never from the placeholder view that renders before the browser
  // is known. That view starts with an empty list, so its first save used to overwrite the
  // visitor's stored alerts with [] before the real view could read them (opening the Alerts
  // page erased every saved alert).
  useEffect(() => {
    if (!persist) return
    saveAlerts(alerts)
  }, [alerts, persist])

  // On open, re-check every alert against current prices so "Current Best" and "Triggered!"
  // are real. (Before, an alert's status was decided once at creation and never updated.)
  useEffect(() => {
    if (initial.length === 0) return
    let cancelled = false
    const query = preferenceQuery(loadPreferences())
    Promise.all(
      initial.map(async (a) => {
        const best = await fetchBest(a.productId, query)
        return best ? evaluateAlert(a, best) : a
      })
    ).then((checked) => {
      if (cancelled) return
      setAlerts((cur) => cur.map((a) => checked.find((c) => c.id === a.id) ?? a))
    })
    return () => {
      cancelled = true
    }
  }, [initial])

  const handleDelete = (id: string) => {
    setAlerts((cur) => cur.filter((a) => a.id !== id))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = Number(newTarget)
    if (!newTarget || !Number.isFinite(target) || target <= 0) {
      setError("Enter a target price above ₹0.")
      return
    }
    setError(null)

    // Look up the product's real current best price. This used to send a hard-coded 25490
    // (the Sony price) for every product, so alerts on anything else started out wrong.
    const best = await fetchBest(selectedProduct, preferenceQuery(loadPreferences()))
    if (!best) {
      setError("Couldn't load that product's current price. Please try again.")
      return
    }
    const label = PRODUCT_OPTIONS.find((o) => o.id === selectedProduct)?.label ?? selectedProduct
    const created = evaluateAlert(
      {
        id: `alert-${Date.now()}`,
        productId: selectedProduct,
        productName: label,
        targetPrice: target,
        currentBestPrice: best.price,
        isTriggered: false,
        createdAt: new Date().toISOString(),
      },
      best
    )
    setAlerts((cur) => upsertAlert(cur, created))
    setNewTarget("")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Price Drop Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set target prices for tracked products. When effective landed cost drops below your target, you receive an in-app trigger.
        </p>
      </div>

      {/* Create Alert Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Set a New Price Alert</CardTitle>
          <CardDescription>Get notified as soon as any platform dips below your target</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              {PRODUCT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Target Price in ₹ (e.g. 24000)"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-full sm:w-56"
              min={1}
              required
            />
            <Button type="submit" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Set Alert
            </Button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alert Listings */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Your Tracked Alerts</h2>
        {alerts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No active alerts. Add an alert above to get notified on price drops.
            </CardContent>
          </Card>
        )}

        {alerts.map((alert) => (
          <Card key={alert.id} className={alert.isTriggered ? "border-green-500 bg-green-50/20" : ""}>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{alert.productName}</span>
                  {alert.isTriggered ? (
                    <Badge variant="buyNow" className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Triggered!
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Active
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Target: <strong className="text-foreground">{formatINR(alert.targetPrice)}</strong></span>
                  <span>Current Best: <strong className="text-foreground">{formatINR(alert.currentBestPrice)}</strong></span>
                  {alert.platform && <span>Platform: <strong>{alert.platform}</strong></span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/compare/${alert.productId}`}>
                  <Button variant="outline" size="sm">View Deal</Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(alert.id)}
                  aria-label="Delete alert"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
