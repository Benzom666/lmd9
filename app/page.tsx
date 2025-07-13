"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Loader2,
  Eye,
  EyeOff,
  Truck,
  Zap,
  Shield,
  ArrowRight,
  ChevronLeft,
  Settings,
  BookOpen,
  FileText,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/contexts/theme-context"
import { WallpaperSelector } from "@/components/wallpaper-selector"

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("admin")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState<boolean>(false)

  const { actualTheme } = useTheme()

  // Super Admin mode state
  const [superAdminOpen, setSuperAdminOpen] = useState<boolean>(false)
  const [superAdminUsername, setSuperAdminUsername] = useState<string>("")
  const [superAdminPassword, setSuperAdminPassword] = useState<string>("")
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState<boolean>(false)
  const [superAdminLoading, setSuperAdminLoading] = useState<boolean>(false)
  const [superAdminError, setSuperAdminError] = useState<string | null>(null)

  // Animation states
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSuperAdminLogin = async () => {
    setSuperAdminError(null)
    setSuperAdminLoading(true)

    try {
      console.log("🔧 Super Admin: Attempting login...")

      if (!superAdminUsername || !superAdminPassword) {
        setSuperAdminError("Username and password are required")
        return
      }

      // Check for super admin credentials
      const superAdminEmail = "super.admin@delivery-system.com"
      const expectedPassword = "superadmin123"

      if (superAdminUsername !== "superadmin" || superAdminPassword !== expectedPassword) {
        setSuperAdminError("Invalid super admin credentials")
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: superAdminEmail,
        password: expectedPassword,
      })

      if (signInError) {
        console.log("🔧 Creating super admin account...")

        try {
          const createResponse = await fetch("/api/create-super-admin")
          const createData = await createResponse.json()

          if (!createResponse.ok) {
            throw new Error(createData.error || "Failed to create super admin account")
          }

          console.log("✅ Super admin account created, attempting login...")

          const { data: retryData, error: retrySignInError } = await supabase.auth.signInWithPassword({
            email: superAdminEmail,
            password: expectedPassword,
          })

          if (retrySignInError) {
            throw new Error(retrySignInError.message || "Failed to sign in after account creation")
          }

          if (retryData.user) {
            console.log("✅ Super admin login successful after creation")
            window.location.href = "/super-admin"
            return
          }
        } catch (createError) {
          console.error("Failed to create super admin:", createError)
          throw new Error("Failed to create super admin account")
        }
      }

      if (data.user) {
        console.log("✅ Authentication successful, checking role...")

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()

        if (profileError) {
          console.error("Profile fetch error:", profileError)
          console.log("🔧 Creating super admin profile...")

          const { error: insertError } = await supabase.from("user_profiles").insert({
            user_id: data.user.id,
            email: superAdminEmail,
            first_name: "Super",
            last_name: "Admin",
            role: "super_admin",
          })

          if (insertError) {
            console.error("Failed to create profile:", insertError)
            throw new Error("Failed to create super admin profile")
          }

          console.log("✅ Super admin profile created, redirecting...")
          window.location.href = "/super-admin"
          return
        }

        if (profileData) {
          console.log("Profile data:", profileData)

          if (profileData.role === "super_admin") {
            console.log("✅ Super admin access granted")
            window.location.href = "/super-admin"
          } else {
            throw new Error("Invalid user role for super admin access")
          }
        } else {
          throw new Error("No profile data found")
        }
      }
    } catch (err) {
      console.error("❌ Super admin login error:", err)
      setSuperAdminError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSuperAdminLoading(false)
    }
  }

  const handleSignIn = async (role: string) => {
    setError(null)
    setIsLoading(true)

    try {
      if (!email || !password) {
        setError("Email and password are required")
        return
      }

      console.log("🔐 Attempting sign in:", email)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: keepLoggedIn ? "local" : "session",
        },
      })

      if (signInError) {
        setError(signInError.message || "Failed to sign in")
        return
      }

      if (data.user) {
        console.log("✅ Sign in successful")

        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()

        if (profileData) {
          const dashboardPath =
            profileData.role === "admin" ? "/admin/dashboard" : profileData.role === "driver" ? "/driver/orders" : "/"
          window.location.href = dashboardPath
        } else {
          const dashboardPath = role === "admin" ? "/admin/dashboard" : role === "driver" ? "/driver/orders" : "/"
          window.location.href = dashboardPath
        }
      }
    } catch (err) {
      console.error("❌ Sign in error:", err)
      setError("An unexpected error occurred during sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (role: string) => {
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!email || !password || !firstName) {
      setError("Email, password, and first name are required")
      return
    }

    setIsLoading(true)

    try {
      console.log("📝 Attempting sign up:", email, role)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (signUpError) {
        console.error("🔥 supabase.auth.signUp() error. Type:", typeof signUpError)
        try {
          console.error("🔥 supabase.auth.signUp() error. Stringified:", JSON.stringify(signUpError, null, 2))
        } catch (e) {
          console.error("🔥 supabase.auth.signUp() error. Could not stringify:", signUpError)
        }
        console.error("🔥 supabase.auth.signUp() error. Raw value:", signUpError)

        let displayMessage = "Failed to sign up."
        if (typeof signUpError === "string") {
          displayMessage = signUpError // Use the string directly if it is a string
        } else if (signUpError && typeof (signUpError as any).message === "string") {
          displayMessage = (signUpError as any).message
        }

        // Append a note about the server-side nature of the 500 error
        displayMessage +=
          " (This is likely a server-side issue. CRITICAL: Check Supabase Database Logs for the root cause of the HTTP 500 error from /auth/v1/signup. Also, review triggers on 'auth.users' table and RLS policies.)"
        setError(displayMessage)
        return
      }

      if (data.user) {
        console.log("User created in auth.users, user object:", data.user)
        console.log("Now attempting to insert into user_profiles for user_id:", data.user.id)

        const { error: profileError } = await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: role,
        })

        if (profileError) {
          console.error("Profile creation error:", profileError)
          setError(profileError.message || "Failed to create user profile. Please try again.")
          setIsLoading(false)
          return
        }

        const { data: signInData, error: signInErrorAfterProfile } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInErrorAfterProfile) {
          setError(signInErrorAfterProfile.message || "Account created but failed to sign in")
          return
        }

        if (signInData.user) {
          console.log("✅ Sign up and sign in successful")
          const dashboardPath = role === "admin" ? "/admin/dashboard" : role === "driver" ? "/driver/orders" : "/"
          window.location.href = dashboardPath
        }
      }
    } catch (err) {
      console.error("❌ Sign up error (generic catch):", err)
      let specificMessage = "An unexpected error occurred during sign up. Check console for details."
      if (err instanceof Error && err.message) {
        specificMessage = err.message
      } else if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as any).message === "string"
      ) {
        specificMessage = (err as any).message
      }
      setError(specificMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const clearForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setFirstName("")
    setLastName("")
    setKeepLoggedIn(false)
    setError(null)
  }

  const clearSuperAdminForm = () => {
    setSuperAdminUsername("")
    setSuperAdminPassword("")
    setSuperAdminError(null)
    setShowSuperAdminPassword(false)
  }

  const switchToSignup = () => {
    setShowSignup(true)
    clearForm()
  }

  const switchToLogin = () => {
    setShowSignup(false)
    clearForm()
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Theme Toggle & Wallpaper Selector - Top Left */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        {actualTheme === "liquid" && <WallpaperSelector />}
      </div>

      {/* Super Admin Access Button - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          onClick={() => {
            setSuperAdminOpen(true)
            clearSuperAdminForm()
          }}
          variant="outline"
          size="sm"
          className="bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20 hover:border-red-400/50 hover:text-red-300 dark:bg-red-600/5 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-600/10 transition-all duration-300"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div
          className={`w-full max-w-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Truck
                  className={`w-12 h-12 transition-colors ${actualTheme === "liquid" ? "text-cyan-300" : "text-primary"}`}
                />
                <div
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping ${actualTheme === "liquid" ? "bg-purple-400" : "bg-primary"}`}
                ></div>
              </div>
            </div>
            <h1
              className={`text-4xl font-bold bg-clip-text text-transparent mb-2 ${actualTheme === "liquid" ? "bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300" : "bg-gradient-to-r from-primary to-foreground/80"}`}
            >
              DeliveryOS
            </h1>
            <p
              className={`text-sm font-light tracking-wide ${actualTheme === "liquid" ? "text-slate-400" : "text-muted-foreground"}`}
            >
              Next-generation delivery management
            </p>
          </div>

          {/* Main Card */}
          <Card className={`transition-all duration-500 ${actualTheme === "liquid" ? "card" : "bg-card"}`}>
            <CardContent className="p-8">
              {/* Role Selector */}
              <div
                className={`flex mb-8 rounded-lg p-1 transition-colors ${actualTheme === "liquid" ? "bg-black/20" : "bg-muted"}`}
              >
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
                    activeTab === "admin"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  Admin
                </button>
                <button
                  onClick={() => setActiveTab("driver")}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
                    activeTab === "driver"
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  Driver
                </button>
              </div>

              {!showSignup ? (
                // Login Form
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
                    <p className="text-sm text-muted-foreground">Sign in to your account</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="h-12 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="keep-logged-in"
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <Label htmlFor="keep-logged-in" className="text-sm font-medium cursor-pointer">
                      Keep me logged in
                    </Label>
                  </div>

                  <Button
                    onClick={() => handleSignIn(activeTab)}
                    disabled={isLoading}
                    className="w-full h-12 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <button
                      onClick={switchToSignup}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors duration-300"
                    >
                      Don't have an account? <span className="font-medium">Create one</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Signup Form
                <div className="space-y-6">
                  <div className="flex items-center mb-4">
                    <button
                      onClick={switchToLogin}
                      className="text-muted-foreground hover:text-foreground transition-colors mr-3"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold">Create Account</h2>
                      <p className="text-muted-foreground text-sm">Join the delivery network</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupEmail" className="text-sm font-medium">
                      Email Address *
                    </Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPassword" className="text-sm font-medium">
                      Password *
                    </Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password *
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="h-12"
                    />
                  </div>

                  <Button
                    onClick={() => handleSignUp(activeTab)}
                    disabled={isLoading}
                    className="w-full h-12 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? "Creating Account..." : `Create ${activeTab === "admin" ? "Admin" : "Driver"} Account`}
                  </Button>

                  <div className="text-center">
                    <button
                      onClick={switchToLogin}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors duration-300"
                    >
                      Already have an account? <span className="font-medium">Sign in</span>
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className={`mt-4 p-3 rounded-lg ${actualTheme === "liquid" ? "bg-red-500/10 border border-red-500/20" : "bg-destructive/10 border border-destructive/20"}`}
                >
                  <p
                    className={`text-sm text-center ${actualTheme === "liquid" ? "text-red-300" : "text-destructive"}`}
                  >
                    {error}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Links */}
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="/features"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-[1.02] border"
            >
              <Zap className="w-4 h-4" />
              Features
            </a>
            <a
              href="/user-manual"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-[1.02] border"
            >
              <BookOpen className="w-4 h-4" />
              User Manual
            </a>
          </div>

          {/* API Documentation Link */}
          <div className="mt-4 text-center">
            <a
              href="/api-docs"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm transition-colors duration-300"
            >
              <FileText className="w-4 h-4" />
              API Documentation
            </a>
          </div>
        </div>
      </div>

      {/* Super Admin Login Dialog */}
      <Dialog open={superAdminOpen} onOpenChange={setSuperAdminOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              System Administration
            </DialogTitle>
            <DialogDescription>Restricted access. Authorized personnel only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="super-admin-username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="super-admin-username"
                type="text"
                value={superAdminUsername}
                onChange={(e) => setSuperAdminUsername(e.target.value)}
                placeholder="Enter username"
                disabled={superAdminLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="super-admin-password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="super-admin-password"
                  type={showSuperAdminPassword ? "text" : "password"}
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={superAdminLoading}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                  disabled={superAdminLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSuperAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {superAdminError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{superAdminError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSuperAdminLogin}
                disabled={superAdminLoading || !superAdminUsername || !superAdminPassword}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
              >
                {superAdminLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access System"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuperAdminOpen(false)
                  clearSuperAdminForm()
                }}
                disabled={superAdminLoading}
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              All access attempts are monitored and logged.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
