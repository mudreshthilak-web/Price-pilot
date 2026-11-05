"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from "recharts"
import { ArrowLeft, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatINR } from "@/lib/utils"
import type { ComparisonResult } from "@/lib/types"

const PLATFORM_COLORS: Record<string, string> = {
  Amazon: "#ff9900",
  Flipkart: "#2874f0",
  Croma: "#00b5b8",
  "Reliance Digital": "#e42529",
}

export default function MatrixPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [data, setData] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${resolvedParams.id}/compare`)
      .then((res) => res.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/4" />
          <div className="h-96 bg-secondary rounded" />
        </div>
      </div>
    )
  }

  if (!data || !data.listings) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-xl font-bold mb-4">No Data Available</h1>
        <Link href={`/compare/${resolvedParams.id}`}>
          <Button variant="outline">Back to Product</Button>
        </Link>
      </div>
    )
  }

  // Find lowest price to compute price level relative to cheapest
  const lowestPrice = Math.min(...data.listings.map((l) => l.effectivePrice.effectivePrice))

  const matrixPoints = data.listings.map((item) => {
    // x = price level (effective price relative to cheapest %, e.g., 100% = cheapest, 110% = 10% more expensive)
    const priceRatio = (item.effectivePrice.effectivePrice / lowestPrice) * 100
    return {
      name: item.listing.platform,
      x: parseFloat(priceRatio.toFixed(1)),
      y: item.sellerTrust.sellerTrustScore,
      dealScore: item.dealScore.totalScore,
      price: item.effectivePrice.effectivePrice,
      isExcluded: item.dealScore.isExcluded,
      classification: item.dealScore.classification,
    }
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/compare/${resolvedParams.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Comparison
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">2D Deal Quality Matrix</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Evaluating each platform offer across Price Level (relative to cheapest) vs. Seller Trust.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Price Competitiveness vs. Seller Trust</CardTitle>
          <CardDescription>
            Hover over any point to inspect platform offer, effective price and consensus Deal Score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Price Ratio" 
                  unit="%" 
                  domain={[95, 120]}
                  label={{ value: 'Price Level vs. Cheapest (100% = Best)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Seller Trust" 
                  domain={[0, 100]}
                  label={{ value: 'Seller Trust Score (0-100)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="bg-popover border p-3 rounded-lg shadow-lg text-xs space-y-1">
                          <p className="font-bold text-sm">{d.name}</p>
                          <p>Effective Price: <span className="font-semibold">{formatINR(d.price)}</span></p>
                          <p>Price Ratio: {d.x}%</p>
                          <p>Seller Trust: {d.y}/100</p>
                          <p>Deal Score: <span className="font-bold">{d.dealScore}</span></p>
                          <Badge variant={d.classification === 'Buy Now' ? 'buyNow' : d.classification === 'Avoid' ? 'avoid' : 'wait'}>
                            {d.classification}
                          </Badge>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {/* Quadrant dividing lines */}
                <ReferenceLine x={105} stroke="#94a3b8" strokeDasharray="3 3" />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min Trust (50)', fill: '#ef4444', fontSize: 10 }} />
                
                <Scatter name="Offers" data={matrixPoints} fill="#3b82f6" shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quadrants Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <h4 className="font-bold text-sm text-green-700 dark:text-green-400">Q1: Best Value (Low Price, High Trust)</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Top tier primary recommendations offering the cheapest landed cost from verified reliable sellers.
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <h4 className="font-bold text-sm text-blue-700 dark:text-blue-400">Q2: Premium Reliable (Higher Price, High Trust)</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Good fallback option if expedited delivery, official brand warranty or flexible return window is paramount.
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <h4 className="font-bold text-sm text-red-700 dark:text-red-400">Q3: Bait Deals (Low Price, Low Trust)</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Suspiciously cheap listings from unrated or poorly rated sellers. Excluded by critical override rule.
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="pt-4">
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Q4: Poor Value (High Price, Low Trust)</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Expensive offers with inadequate seller trust. Never recommended under any scenario.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
