"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
        role="button"
        aria-describedby="tooltip"
      >
        {children}
      </div>
      {isVisible && (
        <div
          id="tooltip"
          role="tooltip"
          className={cn(
            "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm rounded-md shadow-md bg-popover text-popover-foreground border min-w-[200px]",
            className
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
        </div>
      )}
    </div>
  )
}
