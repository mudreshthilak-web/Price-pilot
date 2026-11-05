"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, ShieldCheck, Activity, Terminal, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Metric {
  title: string
  value: string
  type: string
  testSource?: string
  description: string
}

interface TestSummary {
  available: boolean
  numTotalTests: number | null
  numPassedTests: number | null
  numFailedTests: number | null
  success: boolean | null
}

interface Telemetry {
  metrics: Metric[]
  testSummary: TestSummary
  latencyMs?: number
}

export default function DashboardPage() {
  const [data, setData] = useState<Telemetry | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    return fetch("/api/evaluation")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
        setFailed(false)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const fetchTelemetry = () => {
    setLoading(true)
    load()
  }

  const tests = data?.testSummary

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Evaluation &amp; Accuracy Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live engine measurements &amp; test results (read from <code className="text-xs bg-muted px-1.5 py-0.5 rounded">test-results.json</code>). Metrics that need real retailer data are marked not measured.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchTelemetry}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {failed && (
        <p className="text-sm text-destructive mb-4" role="alert">
          Couldn&apos;t load the metrics. Please try Refresh Metrics.
        </p>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {(data?.metrics || []).map((metric) => (
          <Card key={metric.title} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{metric.title}</CardTitle>
                <Badge
                  variant={metric.type === "measured" ? "default" : "outline"}
                  className="text-[10px] uppercase tracking-wider"
                >
                  {metric.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground mb-1 tracking-tight">
                {metric.value}
              </div>
              {metric.testSource && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{metric.testSource}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Execution Summary Box */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Verification Pipeline Status</CardTitle>
          </div>
          <CardDescription>
            Engine regression test suite execution status &amp; accuracy telemetry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            {tests?.available ? (
              <Badge variant={tests.success ? "buyNow" : "avoid"}>
                {tests.success
                  ? `All ${tests.numPassedTests}/${tests.numTotalTests} Vitest Tests Passed`
                  : `${tests.numPassedTests}/${tests.numTotalTests} Vitest Tests Passed (${tests.numFailedTests} failing)`}
              </Badge>
            ) : (
              <Badge variant="outline">{loading ? "Loading test results..." : "Test report not included in this deployment"}</Badge>
            )}
            {typeof data?.latencyMs === "number" && (
              <span className="text-xs text-muted-foreground">
                • Engine latency ~{data.latencyMs < 1 ? data.latencyMs.toFixed(2) : data.latencyMs.toFixed(1)} ms per product
              </span>
            )}
          </div>
          <p>
            Test counts come from the last Vitest run (<code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">test-results.json</code>, regenerate with <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">npm run test:report</code>).
            Matching accuracy, engine latency and basket savings are measured live on each request across the 4 engines: Product Matching, Landed Cost, 90-day Trend Analysis and Seller Trust.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
