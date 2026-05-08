"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type HelpTipProps = {
  children: React.ReactNode
  className?: string
}

export function HelpTip({ children, className }: HelpTipProps) {
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<number | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(true)
  }

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  React.useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ajuda"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onFocus={cancelClose}
          onBlur={scheduleClose}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition hover:text-emerald-700 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        onFocus={cancelClose}
        onBlur={scheduleClose}
        className="w-72 p-3 text-xs leading-relaxed"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
