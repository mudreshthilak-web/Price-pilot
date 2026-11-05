"use client"

import { useState, useSyncExternalStore } from "react"
import { Sliders, CreditCard, ShoppingBag, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  subscribeNever,
  type StoredPreferences,
} from "@/lib/client-store"

const AVAILABLE_CARDS = [
  { id: "HDFC", name: "HDFC Bank Credit Card", discount: "Up to ₹1,500 off" },
  { id: "Axis", name: "Axis Bank Flipkart Credit Card", discount: "5% Unlimited Cashback" },
  { id: "ICICI", name: "ICICI Bank Amazon Pay / Platinum Card", discount: "Instant ₹1,500 - ₹2,000 off" },
  { id: "SBI", name: "SBI Card SimplyCLICK / Elite", discount: "Up to ₹1,500 off" },
  { id: "Kotak", name: "Kotak Mahindra Bank Card", discount: "Up to ₹1,000 off" },
]

const PLATFORMS = [
  "Amazon", 
  "Flipkart", 
  "Croma", 
  "Reliance Digital",
  "Tata CLiQ",
  "Myntra",
  "Vijay Sales",
  "Meesho"
]

/**
 * Renders the form with defaults on the server, then once in the browser remounts it with
 * whatever the visitor saved earlier (no layout shift, no hydration mismatch).
 */
export default function PreferencesPage() {
  const inBrowser = useSyncExternalStore(subscribeNever, () => true, () => false)
  return (
    <PreferencesForm
      key={inBrowser ? "browser" : "server"}
      initial={inBrowser ? loadPreferences() ?? DEFAULT_PREFERENCES : DEFAULT_PREFERENCES}
    />
  )
}

function PreferencesForm({ initial }: { initial: StoredPreferences }) {
  const [selectedCards, setSelectedCards] = useState<string[]>(initial.cards)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initial.platforms)
  const [deliveryUrgency, setDeliveryUrgency] = useState<"standard" | "fast" | "express">(initial.deliveryUrgency)
  const [useCustomWeights, setUseCustomWeights] = useState(initial.useCustomWeights)
  const [saved, setSaved] = useState(false)

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardId) ? prev.filter((c) => c !== cardId) : [...prev, cardId]
    )
  }

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    )
  }

  const handleSave = () => {
    // Previously this only flipped the "saved" message; nothing was stored or used.
    savePreferences({
      cards: selectedCards,
      platforms: selectedPlatforms,
      deliveryUrgency,
      useCustomWeights,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Shopping Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your payment cards, preferred shopping platforms (Amazon, Flipkart, Croma, Reliance, Tata CLiQ, Vijay Sales, Myntra, Meesho), and scoring preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Payment Cards Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">My Payment Cards</CardTitle>
            </div>
            <CardDescription>
              Bank &amp; card offers will only be subtracted from effective payable amounts if you possess the card.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AVAILABLE_CARDS.map((card) => {
              const active = selectedCards.includes(card.id)
              return (
                <div
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    active ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{card.name}</p>
                    <p className="text-xs text-muted-foreground">{card.discount}</p>
                  </div>
                  <Badge variant={active ? "default" : "outline"}>
                    {active ? "Active" : "Disabled"}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Preferred Platforms */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Supported Ecommerce Platforms ({PLATFORMS.length})</CardTitle>
            </div>
            <CardDescription>Select which online stores to include in cross-platform price comparisons.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p)
                return (
                  <Button
                    key={p}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="justify-between text-xs px-3"
                    onClick={() => togglePlatform(p)}
                  >
                    <span className="truncate">{p}</span>
                    <span className="ml-1 text-[11px] opacity-75">{active ? "✓" : "+"}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Urgency */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Delivery Urgency</CardTitle>
            </div>
            <CardDescription>
              Adjusts the delivery speed weight only if you opt-in; otherwise the default consensus weights stay active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="optin"
                checked={useCustomWeights}
                onChange={(e) => setUseCustomWeights(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="optin" className="text-sm font-medium">
                Adjust delivery speed scoring weight based on urgency
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["standard", "fast", "express"] as const).map((urgency) => (
                <Button
                  key={urgency}
                  disabled={!useCustomWeights}
                  variant={deliveryUrgency === urgency ? "default" : "outline"}
                  onClick={() => setDeliveryUrgency(urgency)}
                  className="capitalize"
                >
                  {urgency}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {useCustomWeights
                ? `Delivery Speed weight boosted for ${deliveryUrgency} priority.`
                : "Using official report default weights (Speed: 15%, Price: 40%, Trend: 25%, Trust: 20%)."}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
          <Button onClick={handleSave} className="px-6">
            Save Preferences
          </Button>
          {saved && <span className="text-sm font-semibold text-green-600">Preferences updated successfully!</span>}
        </div>
      </div>
    </div>
  )
}
