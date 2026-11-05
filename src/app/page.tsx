"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
  Search, TrendingUp, IndianRupee, Zap, ArrowRight, 
  Sparkles, Layers, ShieldCheck, ChevronRight, Clock
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setLastSearch } from "@/lib/client-store"

const categories = [
  { name: "Electronics", emoji: "📱" },
  { name: "Appliances", emoji: "🏠" },
  { name: "Accessories", emoji: "🎧" },
]

const features = [
  {
    icon: IndianRupee,
    title: "True Landed Cost",
    badge: "Engine 2",
    description: "Calculates the exact amount payable after platform convenience fees, delivery charges, coupons, and bank card discounts.",
  },
  {
    icon: TrendingUp,
    title: "90-Day Price Trend",
    badge: "Engine 3",
    description: "Analyzes daily price history against the 90-day median to verify genuine deals and alert you against fake inflated MRPs.",
  },
  {
    icon: ShieldCheck,
    title: "Seller Trust & Delivery",
    badge: "Engine 4",
    description: "Evaluates seller ratings, review counts, return windows, warranty, and estimated fulfillment speeds.",
  },
  {
    icon: Zap,
    title: "Consensus Deal Score",
    badge: "AI Consensus",
    description: "0–100 consensus recommendation rating: Buy Now (70+), Wait / Consider (40-69), or Avoid with critical safety overrides.",
  },
]

interface ProductSuggestion {
  id: string
  name: string
  brand: string
  category: string
  lowestPrice?: number
  storeCount?: number
}

const RECENT_KEY = "pricepilot:recent-searches"
const TYPEAHEAD_LIMIT = 8

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, 5) : []
  } catch {
    return []
  }
}

function saveRecent(term: string) {
  try {
    const next = [term, ...loadRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage can be unavailable (private mode); recent searches are a nicety only */
  }
}

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [searchedQuery, setSearchedQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recent, setRecent] = useState<string[]>([])
  const requestId = useRef(0)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const searchProducts = useCallback(async (q: string) => {
    const trimmed = q.trim()
    // Every request gets an id; only the newest one is allowed to update the UI, so a slow
    // response for "iph" can no longer overwrite the results for "iphone 17".
    const thisRequest = ++requestId.current
    if (trimmed.length < 2) {
      setSuggestions([])
      setTotal(0)
      setSearchedQuery("")
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${TYPEAHEAD_LIMIT}`)
      const data = await res.json()
      if (thisRequest !== requestId.current) return
      setSuggestions(data.products || [])
      setTotal(typeof data.total === "number" ? data.total : (data.products || []).length)
      setSearchedQuery(trimmed)
      setActiveIndex(-1)
    } catch {
      if (thisRequest !== requestId.current) return
      setSuggestions([])
      setTotal(0)
      setSearchedQuery(trimmed)
    } finally {
      if (thisRequest === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(query), 300)
    return () => clearTimeout(timer)
  }, [query, searchProducts])

  // Close the dropdown when clicking anywhere outside the search box.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const handleSelect = (productId: string) => {
    setShowSuggestions(false)
    if (query.trim().length >= 2) {
      saveRecent(query.trim())
      setLastSearch(query.trim())
    }
    router.push(`/compare/${productId}`)
  }

  const goToResults = (term?: string) => {
    const q = (term ?? query).trim()
    if (q.length < 2) return
    setShowSuggestions(false)
    saveRecent(q)
    setLastSearch(q)
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const rows = suggestions.length
    if (e.key === "ArrowDown" && rows > 0) {
      e.preventDefault()
      setShowSuggestions(true)
      setActiveIndex((i) => (i + 1) % rows)
    } else if (e.key === "ArrowUp" && rows > 0) {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? rows - 1 : i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) handleSelect(suggestions[activeIndex].id)
      else goToResults()
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  const formatPrice = (n: number) => "₹" + n.toLocaleString("en-IN")

  const handleCategoryClick = (category: string) => {
    setQuery(category)
    searchProducts(category)
    setShowSuggestions(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/40">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom" />
        <div className="container relative mx-auto px-4 max-w-5xl text-center">
          
          {/* Logo Showcase */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl p-2 bg-card border border-border shadow-xl ring-1 ring-black/5 hover:scale-105 transition-all duration-300">
              <Image 
                src="/logo.png" 
                alt="Price Pilot Logo" 
                fill 
                sizes="(max-width: 768px) 96px, 112px"
                className="object-contain p-1" 
                priority 
              />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <Badge variant="sample" className="px-3 py-1 text-xs font-medium">
              <span className="mr-1.5" aria-hidden="true">🔬</span>
              Sample Data Active (DATA_SOURCE=mock)
            </Badge>
            <Badge variant="outline" className="px-3 py-1 text-xs text-muted-foreground font-medium">
              INR (₹) Multi-Store Comparison
            </Badge>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
            Smartest Way to Compare <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Online Prices in India
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Instantly compare Amazon, Flipkart, Croma &amp; Reliance Digital.
            See the true payable amount after bank offers &amp; delivery, and verify if a discount is genuine.
          </p>

          {/* Search Box */}
          <div ref={searchBoxRef} className="relative max-w-2xl mx-auto mb-6">
            <div className="relative flex items-center bg-card rounded-2xl shadow-lg border border-border/80 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all p-1.5">
              <Search className="h-5 w-5 text-muted-foreground ml-3 shrink-0" aria-hidden="true" />
              <Input
                type="search"
                placeholder="Search smartphone, headphones, TV, air fryer... (e.g. Sony, iPhone)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => {
                  setRecent(loadRecent())
                  setShowSuggestions(true)
                }}
                onKeyDown={handleKeyDown}
                className="border-0 shadow-none focus-visible:ring-0 text-base h-12 bg-transparent pl-3 pr-4"
                aria-label="Search products"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-autocomplete="list"
                role="combobox"
              />
              <Button size="default" onClick={() => goToResults()} className="shrink-0 rounded-xl px-5 gap-1.5 font-semibold">
                <span>Search</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                role="listbox"
                className="absolute z-50 w-full mt-2 bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl max-h-80 overflow-auto text-left divide-y divide-border/50 animate-in fade-in-50 zoom-in-95 duration-100"
              >
                {suggestions.map((product, i) => (
                  <button
                    key={product.id}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`w-full text-left px-5 py-3.5 hover:bg-accent/80 transition-colors flex items-center justify-between group ${i === activeIndex ? "bg-accent/80" : ""}`}
                    onClick={() => handleSelect(product.id)}
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {product.brand} · {product.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {typeof product.lowestPrice === "number" && (
                        <span className="text-xs text-muted-foreground">from {formatPrice(product.lowestPrice)}</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
                {total > suggestions.length && (
                  <button
                    className="w-full text-left px-5 py-3 text-sm font-semibold text-primary hover:bg-accent/80 transition-colors flex items-center justify-between"
                    onClick={() => goToResults()}
                  >
                    <span>See all {total} results for &ldquo;{query.trim()}&rdquo;</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Nothing found: say so instead of showing an empty, silent box */}
            {showSuggestions && searchedQuery === query.trim() && !loading && suggestions.length === 0 && query.trim().length >= 2 && (
              <div className="absolute z-50 w-full mt-2 bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl text-left px-5 py-4">
                <div className="font-semibold text-foreground">No products found for &ldquo;{query.trim()}&rdquo;</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Try a brand or model (e.g. &ldquo;iPhone 17&rdquo;, &ldquo;Galaxy S26&rdquo;), or a category plus budget (e.g. &ldquo;phones under 30000&rdquo;).
                </div>
              </div>
            )}

            {/* Recent searches, shown when the box is focused and empty */}
            {showSuggestions && query.trim().length < 2 && recent.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl text-left divide-y divide-border/50 overflow-hidden">
                <div className="px-5 py-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Recent searches</div>
                {recent.map((term) => (
                  <button
                    key={term}
                    className="w-full text-left px-5 py-3 hover:bg-accent/80 transition-colors flex items-center gap-3 text-sm"
                    onClick={() => {
                      setQuery(term)
                      goToResults(term)
                    }}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-xs text-muted-foreground self-center mr-1">Popular categories:</span>
            {categories.map((cat) => (
              <Button
                key={cat.name}
                variant="outline"
                size="sm"
                className="rounded-full px-4 text-xs font-medium bg-card/80 hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
                onClick={() => handleCategoryClick(cat.name.toLowerCase())}
              >
                <span className="mr-1.5">{cat.emoji}</span>
                {cat.name}
              </Button>
            ))}
          </div>

        </div>
      </section>

      {/* Benchmark Products Section */}
      <section className="container mx-auto px-4 max-w-5xl pt-12 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4" /> Live Test Benchmark
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Featured Product Comparisons
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            Click any seeded benchmark to inspect cross-platform prices, 90-day trend lines, and the Deal Quality Matrix.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              id: "sony-wh1000xm5",
              name: "Sony WH-1000XM5 Headphones",
              price: "₹25,490",
              original: "₹34,990",
              badge: "Unit Test Fixture",
              tag: "Buy Now (94.8)",
              category: "Accessories",
              stores: ["Amazon", "Flipkart", "Croma", "Reliance"],
            },
            {
              id: "iphone-15-128gb",
              name: "Apple iPhone 15 (128 GB)",
              price: "₹62,499",
              original: "₹79,900",
              badge: "4 Platforms",
              tag: "Best on Flipkart",
              category: "Electronics",
              stores: ["Amazon", "Flipkart", "Croma", "Reliance"],
            },
            {
              id: "iphone-15-256gb",
              name: "Apple iPhone 15 (256 GB)",
              price: "₹73,499",
              original: "₹89,900",
              badge: "Variant Separation",
              tag: "Distinct Variant",
              category: "Electronics",
              stores: ["Amazon", "Flipkart"],
            },
            {
              id: "samsung-43-crystal-4k",
              name: "Samsung 43\" Crystal 4K TV",
              price: "₹26,348",
              original: "₹40,990",
              badge: "4 Platforms",
              tag: "Best on Flipkart",
              category: "Electronics",
              stores: ["Amazon", "Flipkart", "Croma", "Reliance"],
            },
            {
              id: "boat-airdopes-141",
              name: "boAt Airdopes 141 Earbuds",
              price: "₹949",
              original: "₹4,490",
              badge: "Bait Deal Detection",
              tag: "Reliance Excluded",
              category: "Accessories",
              stores: ["Amazon", "Flipkart", "Croma", "Reliance"],
            },
            {
              id: "philips-air-fryer-hd9200",
              name: "Philips Air Fryer HD9200",
              price: "₹5,195",
              original: "₹9,995",
              badge: "Inflated MRP Test",
              tag: "Croma Inflated",
              category: "Appliances",
              stores: ["Amazon", "Flipkart", "Croma", "Reliance"],
            },
          ].map((product) => (
            <Card
              key={product.id}
              onClick={() => router.push(`/compare/${product.id}`)}
              className="group cursor-pointer hover:border-primary/50 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-card border-border/80 flex flex-col justify-between"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                    {product.category}
                  </Badge>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {product.badge}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-1">
                  {product.name}
                </h3>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-black text-foreground">
                    {product.price}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {product.original}
                  </span>
                  <span className="text-[11px] font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded ml-auto">
                    {product.tag}
                  </span>
                </div>

                <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{product.stores.length} Stores</span>
                  </div>
                  <span className="font-semibold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Compare <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The 4 Comparison Engines */}
      <section className="container mx-auto px-4 max-w-5xl py-8">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
            Algorithmic Rigor
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight">The 4 Comparison Engines</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
            Framework-independent pure TypeScript algorithms computing consensus recommendations without bias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="bg-card/60 backdrop-blur border-border/70 rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Formula Card */}
        <Card className="rounded-2xl border-dashed border-2 bg-muted/40 p-2">
          <CardContent className="p-4 text-center">
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="font-bold text-foreground">Consensus Deal Score (0–100)</span> = 0.40 × PriceScore + 0.25 × TrendScore + 0.20 × TrustScore + 0.15 × DeliverySpeed
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
              <Badge variant="buyNow" className="px-3 py-1">✓ Buy Now (70–100)</Badge>
              <Badge variant="wait" className="px-3 py-1">⏳ Wait / Consider (40–69)</Badge>
              <Badge variant="avoid" className="px-3 py-1">✕ Avoid (0–39)</Badge>
              <span className="text-xs text-muted-foreground italic ml-2">
                *Strict Override: Excluded if Match &lt; 85% or Trust &lt; 50
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
