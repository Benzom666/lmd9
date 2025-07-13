"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Scan, Package, Mail, User, Bell, Power } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useTheme } from "@/contexts/theme-context"
import { WallpaperSelector } from "./wallpaper-selector"

const navItems = [
  { href: "/driver/orders", icon: Package, label: "Orders" },
  { href: "/driver/scanner", icon: Scan, label: "Scanner" },
  { href: "/driver/invitations", icon: Mail, label: "Invitations" },
  { href: "/driver/profile", icon: User, label: "Profile" },
]

export function DriverDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { actualTheme } = useTheme()

  return (
    <div className={cn("flex flex-col h-screen", actualTheme === "liquid" ? "" : "bg-background")}>
      <header
        className={cn(
          "flex items-center justify-between h-16 px-4 border-b shrink-0",
          actualTheme === "liquid" ? "bg-slate-900/70 backdrop-blur-2xl border-white/10" : "bg-background",
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} />
            <AvatarFallback>{profile?.first_name?.[0] || "D"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">Driver</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actualTheme === "liquid" && <WallpaperSelector />}
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={signOut}>
            <Power className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 border-t",
          actualTheme === "liquid" ? "bg-slate-900/70 backdrop-blur-2xl border-white/10" : "bg-background",
        )}
      >
        <nav className="grid grid-cols-4 h-16 max-w-md mx-auto">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                pathname.startsWith(item.href) ? "text-primary" : "text-muted-foreground hover:text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </div>
  )
}
