"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, ArrowRight, ChevronRight, SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatINR } from "@/lib/utils"
import { isRecentRelease } from "@/lib/search"
import { setLastSearch } from "@/lib/client-store"

interface ResultProduct {
  id: string
  name: string
  brand: string
  category: string
  subcategory?: string
  variant?: string
  released?: string
  lowestPrice: number
  storeCount: number
}

interface SearchResponse {
  products: ResultProduct[]
  total: number
  brands: { brand: string; count: number }[]
  parsedMaxPrice?: number
}

const SORTS = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
]

const SUGGESTED = ["iPhone 17", "Galaxy S26", "phones under 30000", "noise cancelling headphones", "laptop under 60000"]

function ResultsView({ q }: { q: string }) {
  const router = useRouter()

  const [input, setInput] = useState(q)
  const [sort, setSort] = useState("relevance")
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  // The latest finished response, tagged with the request it answers. "Loading" is derived
  // (the current request key differs from the answered one), so no setState runs in the effect body.
  const [answer, setAnswer] = useState<{ key: string; data: SearchResponse | null; error: string | null } | null>(null)
  const requestId = useRef(0)

  const requestKey = `${q}|${sort}|${selectedBrands.join(",")}`
  const answered = answer && answer.key === requestKey ? answer : null
  const loading = q.length >= 2 && !answered
  // Keep showing the previous results (dimmed) while a refinement loads, instead of flashing empty.
  const shownData = answered ? answered.data : answer ? answer.data : null
  const error = answered ? answered.error : null

  useEffect(() => {
    if (q.length < 2) return
    // Remember this search (session only) so "Back to Search" on a product page returns here.
    setLastSearch(q)
    const thisRequest = ++requestId.current
    const qs = new URLSearchParams({ q, sort })
    if (selectedBrands.length) qs.set("brand", selectedBrands.join(","))
    fetch(`/api/search?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (thisRequest !== requestId.current) return
        if (json.error) throw new Error(json.error)
        setAnswer({ key: requestKey, data: json, error: null })
      })
      .catch((e: unknown) => {
        if (thisRequest !== requestId.current) return
        setAnswer({ key: requestKey, data: null, error: e instanceof Error ? e.message : "Search failed" })
      })
  }, [q, sort, selectedBrands, requestKey])

  const submit = (term: string) => {
    const t = term.trim()
    if (t.length < 2) return
    router.push(`/search?q=${encodeURIComponent(t)}`)
  }

  const toggleBrand = (brand: string) =>
    setSelectedBrands((cur) => (cur.includes(brand) ? cur.filter((b) => b !== brand) : [...cur, brand]))

  const now = new Date()

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Search box, same look as the home page */}
      <div className="relative flex items-center bg-card rounded-2xl shadow-lg border border-border/80 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all p-1.5 max-w-2xl mb-6">
        <Search className="h-5 w-5 text-muted-foreground ml-3 shrink-0" aria-hidden="true" />
        <Input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(input)
          }}
          placeholder="Search smartphone, headphones, TV, air fryer..."
          className="border-0 shadow-none focus-visible:ring-0 text-base h-12 bg-transparent pl-3 pr-4"
          aria-label="Search products"
        />
        <Button size="default" onClick={() => submit(input)} className="shrink-0 rounded-xl px-5 gap-1.5 font-semibold">
          <span>Search</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {q.length < 2 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Type at least two characters to search.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Results for &ldquo;{q}&rdquo;
              </h1>
              <p className="text-sm text-muted-foreground mt-1" aria-live="polite">
                {loading && !shownData
                  ? "Searching..."
                  : shownData
                  ? `${shownData.total} ${shownData.total === 1 ? "product" : "products"}${
                      shownData.parsedMaxPrice ? ` under ${formatINR(shownData.parsedMaxPrice)}` : ""
                    }`
                  : ""}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Brand filters */}
          {shownData && shownData.brands.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Filter by brand">
              <span className="text-xs text-muted-foreground mr-1">Brand:</span>
              {shownData.brands.map((b) => {
                const active = selectedBrands.includes(b.brand)
                return (
                  <Button
                    key={b.brand}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    aria-pressed={active}
                    className="rounded-full px-3 text-xs font-medium"
                    onClick={() => toggleBrand(b.brand)}
                  >
                    {b.brand} <span className="ml-1 opacity-70">{b.count}</span>
                  </Button>
                )
              })}
              {selectedBrands.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedBrands([])}>
                  Clear
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              Something went wrong: {error}
            </div>
          )}

          {shownData && shownData.products.length === 0 && !loading && (
            <div className="text-center py-16">
              <SearchX className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
              <h2 className="text-lg font-bold mb-1">No products found for &ldquo;{q}&rdquo;</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Check the spelling, or try a brand, model or category with an optional budget.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="rounded-full text-xs" onClick={() => submit(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {shownData && shownData.products.length > 0 && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {shownData.products.map((p) => (
                <Link key={p.id} href={`/compare/${p.id}`} className="block group">
                  <Card className="h-full cursor-pointer group-hover:border-primary/50 group-hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-card border-border/80">
                    <CardContent className="p-6 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                            {p.category}
                          </Badge>
                          {p.released && isRecentRelease(p.released, now) && (
                            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {p.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.brand}
                          {p.subcategory ? ` · ${p.subcategory}` : ""}
                        </p>
                      </div>
                      <div className="flex items-end justify-between mt-5">
                        <div>
                          <div className="text-xs text-muted-foreground">Lowest listed price</div>
                          <div className="text-xl font-extrabold">{formatINR(p.lowestPrice)}</div>
                          <div className="text-[11px] text-muted-foreground">{p.storeCount} stores</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Remounts the results whenever the URL query changes, which resets the box and brand filters. */
function KeyedResults() {
  const params = useSearchParams()
  const q = (params.get("q") || "").trim()
  return <ResultsView key={q} q={q} />
}

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-sm text-muted-foreground">Loading...</div>}>
      <KeyedResults />
    </Suspense>
  )
}
