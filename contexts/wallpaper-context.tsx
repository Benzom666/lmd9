"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

const PREDEFINED_WALLPAPERS = [
  "/images/wallpapers/abstract-1.png",
  "/images/wallpapers/abstract-2.png",
  "/images/wallpapers/abstract-3.png",
  "/images/wallpapers/abstract-4.png",
]

const DEFAULT_WALLPAPER = "/images/liquid-background.png"

interface WallpaperContextType {
  wallpaper: string
  setWallpaper: (url: string) => void
  predefinedWallpapers: string[]
  uploadWallpaper: (file: File) => void
  removeCustomWallpaper: () => void
}

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined)

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [wallpaper, setWallpaperState] = useState(DEFAULT_WALLPAPER)

  useEffect(() => {
    const savedWallpaper = localStorage.getItem("wallpaper")
    if (savedWallpaper) {
      setWallpaperState(savedWallpaper)
    }
  }, [])

  const setWallpaper = useCallback((url: string) => {
    setWallpaperState(url)
    localStorage.setItem("wallpaper", url)
    document.body.style.setProperty("--wallpaper-url", `url(${url})`)
  }, [])

  const uploadWallpaper = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          localStorage.setItem("customWallpaper", result)
          setWallpaper(result)
        }
      }
      reader.readAsDataURL(file)
    },
    [setWallpaper],
  )

  const removeCustomWallpaper = useCallback(() => {
    localStorage.removeItem("customWallpaper")
    setWallpaper(DEFAULT_WALLPAPER)
  }, [setWallpaper])

  useEffect(() => {
    const customWallpaper = localStorage.getItem("customWallpaper")
    const currentWallpaper = customWallpaper || wallpaper
    document.body.style.setProperty("--wallpaper-url", `url(${currentWallpaper})`)
  }, [wallpaper])

  return (
    <WallpaperContext.Provider
      value={{
        wallpaper,
        setWallpaper,
        predefinedWallpapers: PREDEFINED_WALLPAPERS,
        uploadWallpaper,
        removeCustomWallpaper,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  )
}

export function useWallpaper() {
  const context = useContext(WallpaperContext)
  if (context === undefined) {
    throw new Error("useWallpaper must be used within a WallpaperProvider")
  }
  return context
}
