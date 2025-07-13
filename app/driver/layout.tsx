"use client"

import type React from "react"
import { DriverDashboardLayout } from "@/components/driver-dashboard-layout"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useTheme } from "@/contexts/theme-context"
import { cn } from "@/lib/utils"

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { actualTheme } = useTheme()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "driver")) {
      router.push("/")
    }
  }, [profile, loading, router])

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Loading Driver Dashboard...</div>
      </div>
    )
  }

  return (
    <DriverDashboardLayout>
      <div className={cn("p-4", actualTheme === "liquid" && "main-content-area m-4 rounded-lg")}>{children}</div>
    </DriverDashboardLayout>
  )
}
