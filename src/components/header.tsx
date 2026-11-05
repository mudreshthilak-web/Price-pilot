"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { 
  Search, Bell, Settings, ShoppingCart, 
  LayoutDashboard
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Search", href: "/", icon: Search },
  { name: "Basket", href: "/basket", icon: ShoppingCart },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Preferences", href: "/preferences", icon: Settings },
  { name: "Evaluation", href: "/dashboard", icon: LayoutDashboard },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border shadow-sm flex items-center justify-center bg-primary/5">
              <Image 
                src="/logo.png" 
                alt="Price Pilot Logo" 
                width={36} 
                height={36} 
                className="object-cover" 
                priority 
              />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Price Pilot
            </span>
          </Link>

          <Badge variant="sample" className="hidden sm:inline-flex items-center gap-1">
            <span aria-hidden="true">🔬</span>
            Sample data
          </Badge>
        </div>

        <nav className="flex items-center space-x-1" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            )
          })}
          <div className="pl-2 border-l ml-1">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  )
}
