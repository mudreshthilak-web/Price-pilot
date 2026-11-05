"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, TrendingDown, IndianRupee, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/utils"
import type { BasketSummary } from "@/lib/types"

export default function BasketPage() {
  const [basket, setBasket] = useState<BasketSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/basket")
      .then((res) => res.json())
      .then((data) => {
        setBasket(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/4" />
          <div className="h-48 bg-secondary rounded" />
          <div className="h-64 bg-secondary rounded" />
        </div>
      </div>
    )
  }

  if (!basket) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-xl font-bold mb-4">Failed to load basket</h1>
        <Link href="/">
          <Button>Back to Search</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">Basket Savings Calculator</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Aggregating all 5 benchmark products to compute maximum cross-platform basket arbitrage and overall savings.
        </p>
      </div>

      {/* Hero Savings Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-green-500/50 bg-green-50/40 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Smart Pilot Total</span>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {formatINR(basket.totalLowest)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Buying each product at its lowest platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Average Basket</span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {formatINR(basket.totalAverage)}
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">Save {formatINR(basket.savingsVsAverage)} vs Avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Highest Basket</span>
            <div className="text-2xl font-bold text-muted-foreground line-through mt-1">
              {formatINR(basket.totalHighest)}
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">
              Save {formatINR(basket.savingsVsHighest)} ({basket.savingsPercentVsHighest}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Average Price Spread</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {basket.averageSpreadPercent}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average spread between lowest &amp; highest listed price</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Breakdown Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Benchmark Product Catalog Breakdown</CardTitle>
          <CardDescription>
            Best platform selection per item in the seeded basket comparison suite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-3 px-2">Product</th>
                  <th className="text-right py-3 px-2">Lowest (Best)</th>
                  <th className="text-left py-3 px-4">Best Platform</th>
                  <th className="text-right py-3 px-2">Average</th>
                  <th className="text-right py-3 px-2">Highest</th>
                  <th className="text-right py-3 px-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {basket.items.map((item) => (
                  <tr key={item.productId} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3 px-2 font-medium">{item.productName}</td>
                    <td className="py-3 px-2 text-right font-bold text-green-600">
                      {formatINR(item.lowestPrice)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {item.lowestPlatform}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatINR(item.averagePrice)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatINR(item.highestPrice)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Link href={`/compare/${item.productId}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          Compare <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
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
