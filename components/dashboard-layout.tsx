"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Truck,
  Users,
  Settings,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Package,
  Combine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useTheme } from "@/contexts/theme-context"
import { WallpaperSelector } from "./wallpaper-selector"

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/orders", icon: Package, label: "Orders" },
  { href: "/admin/drivers", icon: Users, label: "Drivers" },
  { href: "/admin/integrations", icon: Combine, label: "Integrations" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { actualTheme } = useTheme()

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <div className={cn("flex h-screen w-full", actualTheme === "liquid" ? "" : "bg-muted/40")}>
      <aside
        className={cn(
          "hidden md:flex flex-col border-r transition-all duration-300 ease-in-out",
          actualTheme === "liquid" ? "sidebar" : "bg-background",
          isSidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
            <Truck className="h-6 w-6" />
            {!isSidebarCollapsed && <span className="">DeliveryOS</span>}
          </Link>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname.startsWith(item.href) && "bg-muted text-primary",
                isSidebarCollapsed && "justify-center",
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
              {!isSidebarCollapsed && item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t">
          <div className={cn("flex items-center gap-3 rounded-lg", isSidebarCollapsed ? "justify-center" : "")}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} alt="User avatar" />
              <AvatarFallback>{profile?.first_name?.[0] || "A"}</AvatarFallback>
            </Avatar>
            {!isSidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium leading-none truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground capitalize">
                  {profile?.role?.replace("_", " ")}
                </p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-transparent px-6">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="rounded-full hidden md:flex">
            {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
          <div className="flex-1">{/* Header content can go here */}</div>
          <div className="flex items-center gap-2">
            {actualTheme === "liquid" && <WallpaperSelector />}
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} alt="User avatar" />
                    <AvatarFallback>{profile?.first_name?.[0] || "A"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6",
            actualTheme === "liquid" ? "main-content-area m-4 rounded-2xl" : "",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
