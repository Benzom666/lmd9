"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Search,
  BookOpen,
  Settings,
  Truck,
  Package,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Play,
  Download,
  MessageCircle,
  Mail,
} from "lucide-react"
import Link from "next/link"

interface ContentItem {
  type: "step" | "tip" | "warning" | "info"
  title: string
  content: string
  steps?: string[]
}

interface ManualSection {
  id: string
  title: string
  description: string
  icon: any
  content: ContentItem[]
}

export default function UserManualPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeSection, setActiveSection] = useState("getting-started")

  const manualSections: ManualSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics of DeliveryOS",
      icon: BookOpen,
      content: [
        {
          type: "info",
          title: "System Requirements",
          content: "DeliveryOS works on all modern web browsers and mobile devices. No special software required.",
        },
        {
          type: "step",
          title: "Creating Your Account",
          content: "Follow these steps to set up your DeliveryOS account:",
          steps: [
            "Visit the DeliveryOS homepage",
            "Click 'Create Account' and choose your role (Admin or Driver)",
            "Fill in your details and verify your email",
            "Complete your profile setup",
          ],
        },
        {
          type: "step",
          title: "First Login",
          content: "After account creation, sign in to access your dashboard:",
          steps: [
            "Enter your email and password",
            "Choose 'Keep me logged in' for convenience",
            "Click 'Sign In' to access your dashboard",
          ],
        },
        {
          type: "tip",
          title: "Pro Tip",
          content: "Bookmark your dashboard URL for quick access. Enable browser notifications for real-time updates.",
        },
      ],
    },
    {
      id: "admin-guide",
      title: "Admin Guide",
      description: "Complete guide for administrators",
      icon: Settings,
      content: [
        {
          type: "info",
          title: "Dashboard Overview",
          content:
            "The admin dashboard provides a comprehensive view of your delivery operations with real-time metrics and controls.",
        },
        {
          type: "step",
          title: "Managing Orders",
          content: "Create, assign, and track orders efficiently:",
          steps: [
            "Navigate to Orders → Create New Order",
            "Enter customer details and delivery address",
            "Add package information and special instructions",
            "Assign to available driver or use auto-assignment",
            "Monitor progress in real-time",
          ],
        },
        {
          type: "step",
          title: "Driver Management",
          content: "Onboard and manage your delivery team:",
          steps: [
            "Go to Drivers → Add New Driver",
            "Send invitation email to driver",
            "Review and approve driver applications",
            "Set driver availability and zones",
            "Monitor driver performance metrics",
          ],
        },
        {
          type: "step",
          title: "Shopify Integration",
          content: "Connect your Shopify store for automatic order sync:",
          steps: [
            "Navigate to Integrations → Shopify",
            "Click 'Connect Store' and enter your store URL",
            "Authorize DeliveryOS in your Shopify admin",
            "Configure sync settings and order filters",
            "Test the connection and enable auto-sync",
          ],
        },
        {
          type: "warning",
          title: "Important",
          content: "Always test integrations in a staging environment before enabling them in production.",
        },
      ],
    },
    {
      id: "driver-guide",
      title: "Driver Guide",
      description: "Everything drivers need to know",
      icon: Truck,
      content: [
        {
          type: "info",
          title: "Mobile App Overview",
          content: "The driver app is optimized for mobile use with offline capabilities and GPS integration.",
        },
        {
          type: "step",
          title: "Accepting Orders",
          content: "How to accept and start deliveries:",
          steps: [
            "Open the driver app and ensure you're online",
            "Review incoming order notifications",
            "Tap 'Accept' to claim an order",
            "Review delivery details and route",
            "Tap 'Start Delivery' when ready",
          ],
        },
        {
          type: "step",
          title: "Delivery Process",
          content: "Complete deliveries efficiently:",
          steps: [
            "Follow GPS navigation to delivery address",
            "Contact customer if needed using in-app messaging",
            "Scan package QR code upon arrival",
            "Take photo proof of delivery",
            "Get customer signature if required",
            "Mark delivery as complete",
          ],
        },
        {
          type: "step",
          title: "Using the Scanner",
          content: "Scan packages for verification:",
          steps: [
            "Tap the scanner icon in the app",
            "Point camera at QR code or barcode",
            "Wait for successful scan confirmation",
            "Review package details",
            "Proceed with delivery or report issues",
          ],
        },
        {
          type: "tip",
          title: "Efficiency Tips",
          content:
            "Keep your phone charged, use a phone mount for navigation, and always confirm delivery addresses before departing.",
        },
      ],
    },
    {
      id: "features-tools",
      title: "Features & Tools",
      description: "Detailed feature explanations",
      icon: Package,
      content: [
        {
          type: "step",
          title: "Route Optimization",
          content: "Maximize efficiency with smart routing:",
          steps: [
            "Enable auto-optimization in settings",
            "Review suggested routes before starting",
            "Allow real-time route adjustments",
            "Use traffic data for better timing",
          ],
        },
        {
          type: "step",
          title: "Real-time Tracking",
          content: "Monitor deliveries in real-time:",
          steps: [
            "View live driver locations on map",
            "Track delivery progress and ETAs",
            "Receive automatic status updates",
            "Share tracking links with customers",
          ],
        },
        {
          type: "step",
          title: "Analytics Dashboard",
          content: "Analyze performance metrics:",
          steps: [
            "Access Analytics from main menu",
            "Review delivery time trends",
            "Monitor driver performance",
            "Export reports for analysis",
          ],
        },
        {
          type: "step",
          title: "Label Generation",
          content: "Create shipping labels:",
          steps: [
            "Go to Labels → Generate New",
            "Select orders for labeling",
            "Choose label template",
            "Print or download labels",
          ],
        },
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      description: "Common issues and solutions",
      icon: HelpCircle,
      content: [
        {
          type: "warning",
          title: "Common Issues",
          content: "Here are solutions to frequently encountered problems:",
        },
        {
          type: "step",
          title: "Login Problems",
          content: "Can't access your account?",
          steps: [
            "Check your email and password are correct",
            "Clear browser cache and cookies",
            "Try incognito/private browsing mode",
            "Reset password if needed",
            "Contact support if issues persist",
          ],
        },
        {
          type: "step",
          title: "GPS Issues",
          content: "Location not working properly?",
          steps: [
            "Enable location permissions in browser/app",
            "Check GPS signal strength",
            "Restart the app or refresh browser",
            "Ensure internet connection is stable",
          ],
        },
        {
          type: "step",
          title: "Scanner Problems",
          content: "QR code scanner not working?",
          steps: [
            "Clean camera lens",
            "Ensure good lighting",
            "Hold steady and at proper distance",
            "Try manual code entry if available",
          ],
        },
        {
          type: "step",
          title: "Sync Issues",
          content: "Data not syncing properly?",
          steps: [
            "Check internet connection",
            "Refresh the page or restart app",
            "Log out and log back in",
            "Contact support for persistent issues",
          ],
        },
        {
          type: "tip",
          title: "Getting Help",
          content: "If you can't find a solution here, use the live chat feature or contact our support team directly.",
        },
      ],
    },
  ]

  const filteredSections = useMemo(() => {
    if (!searchTerm) return manualSections

    return manualSections
      .map((section) => ({
        ...section,
        content: section.content.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.steps?.some((step) => step?.toLowerCase().includes(searchTerm.toLowerCase())),
        ),
      }))
      .filter((section) => section.content.length > 0)
  }, [searchTerm])

  const getContentIcon = (type: string) => {
    switch (type) {
      case "step":
        return CheckCircle
      case "tip":
        return Info
      case "warning":
        return AlertTriangle
      case "info":
        return Info
      default:
        return Info
    }
  }

  const getContentColor = (type: string) => {
    switch (type) {
      case "step":
        return "text-green-400 bg-green-400/10 border-green-400/20"
      case "tip":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20"
      case "warning":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
      case "info":
        return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/20"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 dark:bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            User Manual
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Complete guide to using DeliveryOS effectively. Find answers to your questions and learn best practices.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search the manual..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 sticky top-8">
              <CardHeader>
                <CardTitle className="text-white text-lg">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {manualSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                      activeSection === section.id
                        ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <section.icon className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-slate-400">{section.description}</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {filteredSections.map((section) => (
                <div key={section.id} className={activeSection === section.id ? "block" : "hidden"}>
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 mb-6">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-600/20 to-blue-600/20">
                          <section.icon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-2xl">{section.title}</CardTitle>
                          <CardDescription className="text-slate-400">{section.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  <div className="space-y-6">
                    {section.content.map((item, index) => {
                      const IconComponent = getContentIcon(item.type)
                      const colorClass = getContentColor(item.type)

                      return (
                        <Card
                          key={index}
                          className={`border ${colorClass.split(" ")[2]} bg-slate-800/30 backdrop-blur-xl`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${colorClass.split(" ")[1]} ${colorClass.split(" ")[2]}`}>
                                <IconComponent className={`w-5 h-5 ${colorClass.split(" ")[0]}`} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-300 mb-4">{item.content}</p>
                                {item.steps && (
                                  <ol className="space-y-2">
                                    {item.steps.map((step, stepIndex) => (
                                      <li key={stepIndex} className="flex items-start gap-3">
                                        <Badge
                                          variant="outline"
                                          className="mt-0.5 text-xs bg-slate-700/50 border-slate-600"
                                        >
                                          {stepIndex + 1}
                                        </Badge>
                                        <span className="text-slate-300">{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}

              {filteredSections.length === 0 && searchTerm && (
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                  <CardContent className="p-8 text-center">
                    <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-white text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-slate-400">
                      Try searching with different keywords or browse the sections manually.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-16">
          <Card className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-cyan-500/30 backdrop-blur-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Need More Help?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-3 rounded-full bg-cyan-600/20 w-fit mx-auto mb-3">
                    <Play className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Video Tutorials</h3>
                  <p className="text-slate-300 text-sm mb-4">Watch step-by-step video guides</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    Watch Videos
                  </Button>
                </div>
                <div className="text-center">
                  <div className="p-3 rounded-full bg-purple-600/20 w-fit mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Live Chat</h3>
                  <p className="text-slate-300 text-sm mb-4">Get instant help from our team</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    Start Chat
                  </Button>
                </div>
                <div className="text-center">
                  <div className="p-3 rounded-full bg-green-600/20 w-fit mx-auto mb-3">
                    <Mail className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Email Support</h3>
                  <p className="text-slate-300 text-sm mb-4">Send us your questions</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                  >
                    Email Us
                  </Button>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-8">
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
