"use client"

import { useState, useEffect, useRef, type RefObject } from "react"

export function useDraggable(elRef: RefObject<HTMLElement>) {
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })
  const elementStartPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const rect = el.getBoundingClientRect()
      el.style.position = "absolute"

      const initialTop = rect.top + window.scrollY
      const initialLeft = rect.left + window.scrollX

      el.style.top = `${initialTop}px`
      el.style.left = `${initialLeft}px`
      el.style.transform = "none"

      startPos.current = { x: e.clientX, y: e.clientY }
      elementStartPos.current = { x: initialLeft, y: initialTop }

      document.addEventListener("pointermove", onPointerMove)
      document.addEventListener("pointerup", onPointerUp, { once: true })
    }

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault()
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y

      if (elRef.current) {
        elRef.current.style.left = `${elementStartPos.current.x + dx}px`
        elRef.current.style.top = `${elementStartPos.current.y + dy}px`
      }
    }

    const onPointerUp = () => {
      setIsDragging(false)
      document.removeEventListener("pointermove", onPointerMove)
    }

    el.addEventListener("pointerdown", onPointerDown)

    return () => {
      el.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
    }
  }, [elRef])

  return isDragging
}
