"use client"

import type React from "react"
import { useRef } from "react"
import Image from "next/image"
import { useWallpaper } from "@/contexts/wallpaper-context"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ImageIcon, Upload, Trash2 } from "lucide-react"

export function WallpaperSelector() {
  const { wallpaper, setWallpaper, predefinedWallpapers, uploadWallpaper, removeCustomWallpaper } = useWallpaper()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadWallpaper(file)
    }
  }

  const isCustomWallpaper = !predefinedWallpapers.includes(wallpaper) && wallpaper !== "/images/liquid-background.png"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <ImageIcon className="h-5 w-5" />
          <span className="sr-only">Change wallpaper</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Wallpaper</h4>
            <p className="text-sm text-muted-foreground">Select a background for the Liquid Glass theme.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {predefinedWallpapers.map((url) => (
              <button key={url} onClick={() => setWallpaper(url)} className="relative rounded-md overflow-hidden">
                <Image
                  src={url || "/placeholder.svg"}
                  alt={`Wallpaper thumbnail ${url}`}
                  width={150}
                  height={84}
                  className="object-cover"
                />
                {wallpaper === url && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center ring-2 ring-primary ring-offset-2 ring-offset-background" />
                )}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleUploadClick}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {isCustomWallpaper && (
              <Button variant="destructive" onClick={removeCustomWallpaper}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
