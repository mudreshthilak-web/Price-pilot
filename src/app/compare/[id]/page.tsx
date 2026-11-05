"use client"

import { useState, useEffect, use, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp,
  ShoppingCart, ExternalLink, TrendingUp, TrendingDown, Minus,
  Info, Star, Truck, Shield, BarChart3
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip } from "@/components/ui/tooltip"
import { formatINR } from "@/lib/utils"
import type { ComparisonResult, DealScore, EffectivePriceBreakdown } from "@/lib/types"
import {
  evaluateAlert,
  getLastSearchSnapshot,
  loadAlerts,
  loadPreferences,
  preferenceQuery,
  saveAlerts,
  subscribeNever,
  suggestedTarget,
  upsertAlert,
} from "@/lib/client-store"

/** "Back to Search" goes to the results you came from, or the home page if you landed here directly. */
function useBackToSearchHref(): string {
  const last = useSyncExternalStore(subscribeNever, getLastSearchSnapshot, () => null)
  return last && last.trim().length >= 2 ? `/search?q=${encodeURIComponent(last.trim())}` : "/"
}

function DealBadge({ classification }: { classification: string }) {
  if (classification === "Buy Now") {
    return (
      <Badge variant="buyNow" className="gap-1">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        Buy Now
      </Badge>
    )
  }
  if (classification === "Wait / Consider") {
    return (
      <Badge variant="wait" className="gap-1">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Wait / Consider
      </Badge>
    )
  }
  return (
    <Badge variant="avoid" className="gap-1">
      <XCircle className="h-3 w-3" aria-hidden="true" />
      Avoid
    </Badge>
  )
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "falling") return <TrendingDown className="h-4 w-4 text-green-500" aria-label="Price falling" />
  if (trend === "rising") return <TrendingUp className="h-4 w-4 text-red-500" aria-label="Price rising" />
  return <Minus className="h-4 w-4 text-amber-500" aria-label="Price stable" />
}

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${score}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="w-10 text-right font-medium">{score.toFixed(1)}</span>
    </div>
  )
}

function PriceBreakdown({ breakdown }: { breakdown: EffectivePriceBreakdown }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>Listed Price</span>
        <span>{formatINR(breakdown.listedPrice)}</span>
      </div>
      {breakdown.deliveryCharge > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>+ Delivery</span>
          <span>{formatINR(breakdown.deliveryCharge)}</span>
        </div>
      )}
      {breakdown.convenienceFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>+ Convenience Fee</span>
          <span>{formatINR(breakdown.convenienceFee)}</span>
        </div>
      )}
      {breakdown.couponDiscount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>− Coupon</span>
          <span>-{formatINR(breakdown.couponDiscount)}</span>
        </div>
      )}
      {breakdown.bankCardOffer > 0 && (
        <div className="flex justify-between text-green-600">
          <span>− Bank/Card Offer</span>
          <span>-{formatINR(breakdown.bankCardOffer)}</span>
        </div>
      )}
      {breakdown.cashback > 0 && (
        <div className="flex justify-between text-green-600">
          <span>− Cashback</span>
          <span>-{formatINR(breakdown.cashback)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold border-t pt-1">
        <span>Effective Price</span>
        <span>{formatINR(breakdown.effectivePrice)}</span>
      </div>
    </div>
  )
}

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [data, setData] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null)
  const [showExcluded, setShowExcluded] = useState(false)
  const [sortBy, setSortBy] = useState<"dealScore" | "effectivePrice" | "sellerTrust">("dealScore")
  const backHref = useBackToSearchHref()

  useEffect(() => {
    // Saved preferences (cards, stores, delivery priority) change the prices and scores returned.
    fetch(`/api/products/${resolvedParams.id}/compare${preferenceQuery(loadPreferences())}`)
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/3" />
          <div className="h-64 bg-secondary rounded" />
          <div className="h-48 bg-secondary rounded" />
        </div>
      </div>
    )
  }

  if (!data || !data.listings || data.listings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-4">We couldn&apos;t find comparison data for this product.</p>
        <Link href={backHref}>
          <Button>← Back to Search</Button>
        </Link>
      </div>
    )
  }

  const included = data.listings.filter((l) => !l.dealScore.isExcluded)
  const excluded = data.listings.filter((l) => l.dealScore.isExcluded)

  const sorted = [...included].sort((a, b) => {
    if (sortBy === "dealScore") return b.dealScore.totalScore - a.dealScore.totalScore
    if (sortBy === "effectivePrice") return a.effectivePrice.effectivePrice - b.effectivePrice.effectivePrice
    return b.sellerTrust.sellerTrustScore - a.sellerTrust.sellerTrustScore
  })

  const bestDeal = sorted[0]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Product Header */}
      <div className="mb-6">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Search
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">
          {data.product.brand} {data.product.modelNumber}
        </h1>
        <p className="text-muted-foreground">{data.product.variant}</p>
        <Badge variant="sample" className="mt-1">🔬 Sample data</Badge>
      </div>

      {/* Hero Card - Best Deal */}
      {bestDeal && (
        <Card className="mb-6 border-green-500 border-2 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardDescription className="text-green-700 dark:text-green-400 font-medium">
                  🏆 Recommended Purchase
                </CardDescription>
                <CardTitle className="text-xl mt-1">
                  {bestDeal.listing.platform} — {formatINR(bestDeal.effectivePrice.effectivePrice)}
                </CardTitle>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{bestDeal.dealScore.totalScore.toFixed(1)}</div>
                <DealBadge classification={bestDeal.dealScore.classification} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <Info className="h-4 w-4" aria-hidden="true" /> Why this recommendation
              </h4>
              <ul className="space-y-1">
                {bestDeal.dealScore.reasons.map((reason, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/compare/${resolvedParams.id}/history`}>
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" /> Price History
                </Button>
              </Link>
              <Link href={`/compare/${resolvedParams.id}/matrix`}>
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" /> Deal Quality Matrix
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => {
                // Stored in this browser. The target used to equal today's best price, so the
                // alert was "triggered" the instant it was created; now it is 5% below it.
                const best = bestDeal.effectivePrice.effectivePrice
                const target = suggestedTarget(best)
                const created = evaluateAlert(
                  {
                    id: `alert-${Date.now()}`,
                    productId: resolvedParams.id,
                    productName: `${data.product.brand} ${data.product.modelNumber}${data.product.variant ? ` (${data.product.variant})` : ""}`,
                    targetPrice: target,
                    currentBestPrice: best,
                    isTriggered: false,
                    createdAt: new Date().toISOString(),
                  },
                  { price: best, platform: bestDeal.listing.platform }
                )
                saveAlerts(upsertAlert(loadAlerts(), created))
                alert(`Price alert set: we'll flag it when the price drops to ${formatINR(target)} or below. See it on the Alerts page.`)
              }}>
                <Bell className="h-4 w-4 mr-1" /> Set Price Alert
              </Button>
              <Link href="/basket">
                <Button size="sm">
                  <ShoppingCart className="h-4 w-4 mr-1" /> Add to Basket
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {(["dealScore", "effectivePrice", "sellerTrust"] as const).map((option) => (
          <Button
            key={option}
            variant={sortBy === option ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy(option)}
          >
            {option === "dealScore" ? "Deal Score" : option === "effectivePrice" ? "Price" : "Trust"}
          </Button>
        ))}
      </div>

      {/* Platform Comparison Cards */}
      <div className="space-y-4 mb-8">
        {sorted.map((item) => (
          <Card key={item.listing.id} className="overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                {/* Platform Info */}
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between md:block">
                    <div>
                      <h3 className="font-semibold text-lg">{item.listing.platform}</h3>
                      <p className="text-sm text-muted-foreground">{item.listing.sellerName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                        <span className="text-sm font-medium">{Number(item.listing.sellerRating).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({item.listing.numberOfRatings.toLocaleString("en-IN")} ratings)
                        </span>
                      </div>
                    </div>
                    <DealBadge classification={item.dealScore.classification} />
                  </div>
                </div>

                {/* Pricing */}
                <div className="md:col-span-3">
                  <div className="text-2xl font-bold">{formatINR(item.effectivePrice.effectivePrice)}</div>
                  {item.effectivePrice.effectivePrice !== item.listing.listedPrice && (
                    <div className="text-sm text-muted-foreground line-through">{formatINR(item.listing.listedPrice)}</div>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon trend={item.priceTrend.trend} />
                    <span className="text-xs text-muted-foreground">
                      {item.priceTrend.isGenuineDeal && "✓ Genuine deal"}
                      {item.priceTrend.isInflatedDiscount && "⚠ Inflated discount"}
                      {!item.priceTrend.isGenuineDeal && !item.priceTrend.isInflatedDiscount && `${item.priceTrend.trend} trend`}
                    </span>
                  </div>
                  <button
                    className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                    onClick={() => setExpandedBreakdown(
                      expandedBreakdown === item.listing.id ? null : item.listing.id
                    )}
                    aria-expanded={expandedBreakdown === item.listing.id}
                  >
                    {expandedBreakdown === item.listing.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Price breakdown
                  </button>
                  {expandedBreakdown === item.listing.id && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded-md">
                      <PriceBreakdown breakdown={item.effectivePrice} />
                    </div>
                  )}
                </div>

                {/* Scores */}
                <div className="md:col-span-4 space-y-1">
                  <ScoreBar score={item.dealScore.priceCompetitiveness} label="Price" color="bg-blue-500" />
                  <ScoreBar score={item.dealScore.trendScore} label="Trend" color="bg-purple-500" />
                  <ScoreBar score={item.dealScore.sellerTrustScore} label="Trust" color="bg-amber-500" />
                  <ScoreBar score={item.dealScore.deliverySpeedScore} label="Delivery" color="bg-green-500" />
                </div>

                {/* Deal Score */}
                <div className="md:col-span-2 text-center">
                  <Tooltip content={
                    <div className="text-xs space-y-1">
                      <div>Price: {item.dealScore.priceCompetitiveness.toFixed(1)} × 0.40</div>
                      <div>Trend: {item.dealScore.trendScore.toFixed(1)} × 0.25</div>
                      <div>Trust: {item.dealScore.sellerTrustScore.toFixed(1)} × 0.20</div>
                      <div>Speed: {item.dealScore.deliverySpeedScore.toFixed(1)} × 0.15</div>
                    </div>
                  }>
                    <div className="text-3xl font-bold">{item.dealScore.totalScore.toFixed(1)}</div>
                  </Tooltip>
                  <div className="text-xs text-muted-foreground mt-1">Deal Score</div>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-1 text-xs">
                      <Truck className="h-3 w-3" aria-hidden="true" />
                      {item.listing.estimatedDeliveryDays} day{item.listing.estimatedDeliveryDays !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Shield className="h-3 w-3" aria-hidden="true" />
                      {item.listing.returnWindowDays}d return
                    </div>
                  </div>
                </div>
              </div>

              {/* Reasons */}
              {item.dealScore.reasons.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex flex-wrap gap-2">
                    {item.dealScore.reasons.map((reason, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-full">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Excluded Offers */}
      {excluded.length > 0 && (
        <div className="mb-8">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            onClick={() => setShowExcluded(!showExcluded)}
            aria-expanded={showExcluded}
          >
            {showExcluded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Excluded offers ({excluded.length})
          </button>
          {showExcluded && (
            <div className="space-y-3">
              {excluded.map((item) => (
                <Card key={item.listing.id} className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{item.listing.platform}</h3>
                        <p className="text-sm text-muted-foreground">{item.listing.sellerName}</p>
                        <p className="text-lg font-bold">{formatINR(item.effectivePrice.effectivePrice)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="avoid">Excluded</Badge>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {item.dealScore.exclusionReason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sortable Table View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparison Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-right p-2">Listed</th>
                  <th className="text-right p-2">Fees</th>
                  <th className="text-right p-2">Offers</th>
                  <th className="text-right p-2">Effective</th>
                  <th className="text-right p-2">Price Score</th>
                  <th className="text-right p-2">Trend</th>
                  <th className="text-right p-2">Trust</th>
                  <th className="text-right p-2">Speed</th>
                  <th className="text-right p-2">Deal Score</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr key={item.listing.id} className="border-b hover:bg-accent/50">
                    <td className="p-2 font-medium">{item.listing.platform}</td>
                    <td className="p-2 text-right">{formatINR(item.listing.listedPrice)}</td>
                    <td className="p-2 text-right">
                      {formatINR(item.effectivePrice.deliveryCharge + item.effectivePrice.convenienceFee)}
                    </td>
                    <td className="p-2 text-right text-green-600">
                      −{formatINR(item.effectivePrice.couponDiscount + item.effectivePrice.bankCardOffer + item.effectivePrice.cashback)}
                    </td>
                    <td className="p-2 text-right font-bold">{formatINR(item.effectivePrice.effectivePrice)}</td>
                    <td className="p-2 text-right">{item.dealScore.priceCompetitiveness.toFixed(1)}</td>
                    <td className="p-2 text-right">{item.dealScore.trendScore.toFixed(0)}</td>
                    <td className="p-2 text-right">{item.dealScore.sellerTrustScore.toFixed(0)}</td>
                    <td className="p-2 text-right">{item.dealScore.deliverySpeedScore.toFixed(0)}</td>
                    <td className="p-2 text-right font-bold">{item.dealScore.totalScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Need this import for the Bell icon
import { Bell } from "lucide-react"
