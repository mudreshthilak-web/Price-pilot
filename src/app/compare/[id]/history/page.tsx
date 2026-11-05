"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend
} from "recharts"
import { ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatINR } from "@/lib/utils"

const PLATFORM_COLORS: Record<string, string> = {
  Amazon: "#ff9900",
  Flipkart: "#2874f0",
  Croma: "#00b5b8",
  "Reliance Digital": "#e42529",
}

export default function PriceHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [historyData, setHistoryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${resolvedParams.id}/history`)
      .then((res) => res.json())
      .then((data) => {
        setHistoryData(data)
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

  if (!historyData || !historyData.histories) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-xl font-bold mb-4">No Price History Available</h1>
        <Link href={`/compare/${resolvedParams.id}`}>
          <Button variant="outline">Back to Product</Button>
        </Link>
      </div>
    )
  }

  // Format chart data combining all platforms by date
  const platforms = Object.keys(historyData.histories)
  const dateMap = new Map<string, any>()

  platforms.forEach((platform) => {
    historyData.histories[platform].forEach((entry: { date: string; price: number }) => {
      const existing = dateMap.get(entry.date) || { date: entry.date }
      existing[platform] = entry.price
      dateMap.set(entry.date, existing)
    })
  })

  const chartData = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Compute all prices to find 90-day median across all platforms
  const allPrices: number[] = []
  platforms.forEach((platform) => {
    historyData.histories[platform].forEach((entry: { price: number }) => {
      allPrices.push(entry.price)
    })
  })
  allPrices.sort((a, b) => a - b)
  const medianPrice = allPrices[Math.floor(allPrices.length / 2)] || 0

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
        <h1 className="text-2xl font-bold tracking-tight">90-Day Cross-Platform Price History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historical daily price movement compared against the 90-day benchmark median of {formatINR(medianPrice)}.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Price Trend Over 90 Days</CardTitle>
              <CardDescription>Daily prices across Amazon, Flipkart, Croma, and Reliance Digital</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50/50">
                --- 90-Day Median ({formatINR(medianPrice)})
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const parts = val.split("-")
                    return `${parts[1]}/${parts[2]}`
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  domain={['dataMin - 500', 'dataMax + 500']}
                  tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(val: any) => [formatINR(Number(val)), 'Price']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                />
                <Legend />
                <ReferenceLine 
                  y={medianPrice} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ value: `Median: ₹${medianPrice}`, fill: '#ef4444', fontSize: 11, position: 'right' }} 
                />
                {platforms.map((p) => (
                  <Line 
                    key={p} 
                    type="monotone" 
                    dataKey={p} 
                    stroke={PLATFORM_COLORS[p] || "#8884d8"} 
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Explanatory Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 dark:border-green-900 bg-green-50/40 dark:bg-green-950/20">
          <CardContent className="pt-6 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-green-900 dark:text-green-300">Genuine Deal Criteria</h3>
              <p className="text-xs text-muted-foreground mt-1">
                A listing is flagged as a <strong>Genuine Deal</strong> when the current effective price is ≥ 10% below the 90-day platform median.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-300">Inflated Discount Warning</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Flagged when retailers display large MRP cuts (&gt;20%), yet the current listed price is at or above the 90-day median.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
