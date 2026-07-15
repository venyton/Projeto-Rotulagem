"use client"

import * as React from "react"

export function useStickyPanelTop<T extends HTMLElement>(topOffset = 76, bottomOffset = 20) {
  const ref = React.useRef<T>(null)
  const [top, setTop] = React.useState(topOffset)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const nextTop = Math.min(topOffset, window.innerHeight - element.offsetHeight - bottomOffset)
        setTop((current) => (Math.abs(current - nextTop) > 1 ? nextTop : current))
      })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener("resize", update)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [bottomOffset, topOffset])

  return { ref, top }
}
