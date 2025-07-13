"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Truck,
  MapPin,
  QrCode,
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Smartphone,
  Camera,
  Navigation,
  MessageSquare,
  Shield,
  Cloud,
  Database,
  Zap,
  CheckCircle,
  TrendingUp,
  Clock,
  Globe,
} from "lucide-react"
import Link from "next/link"

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState("core")

  const features = {
    core: [
      {
        icon: Truck,
        title: "Smart Delivery Management",
        description: "Intelligent order assignment and route optimization for maximum efficiency",
        benefits: ["Automated driver assignment", "Real-time order tracking", "Delivery time estimation"],
      },
      {
        icon: MapPin,
        title: "GPS Route Optimization",
        description: "Advanced algorithms to find the most efficient delivery routes",
        benefits: ["Reduce fuel costs", "Minimize delivery time", "Dynamic route adjustments"],
      },
      {
        icon: QrCode,
        title: "QR Code Scanning",
        description: "Quick package verification and proof of delivery system",
        benefits: ["Instant package verification", "Digital proof of delivery", "Error reduction"],
      },
      {
        icon: BarChart3,
        title: "Advanced Analytics",
        description: "Comprehensive insights into delivery performance and metrics",
        benefits: ["Performance dashboards", "Delivery analytics", "Cost optimization insights"],
      },
    ],
    admin: [
      {
        icon: Users,
        title: "Driver Management",
        description: "Complete driver onboarding, scheduling, and performance tracking",
        benefits: ["Driver profiles", "Performance metrics", "Scheduling tools"],
      },
      {
        icon: Package,
        title: "Order Processing",
        description: "Streamlined order management from creation to delivery",
        benefits: ["Bulk order import", "Status tracking", "Automated notifications"],
      },
      {
        icon: ShoppingCart,
        title: "Shopify Integration",
        description: "Seamless integration with Shopify stores for automatic order sync",
        benefits: ["Real-time order sync", "Inventory management", "Customer notifications"],
      },
      {
        icon: FileText,
        title: "Documentation & API",
        description: "Comprehensive API documentation and integration guides",
        benefits: ["RESTful API", "Webhook support", "Developer tools"],
      },
    ],
    driver: [
      {
        icon: Smartphone,
        title: "Mobile-First Interface",
        description: "Optimized mobile experience for drivers on the go",
        benefits: ["Touch-friendly design", "Offline capabilities", "Fast loading"],
      },
      {
        icon: Camera,
        title: "Photo Proof of Delivery",
        description: "Capture and store delivery confirmation photos",
        benefits: ["Photo verification", "Digital signatures", "Timestamp records"],
      },
      {
        icon: Navigation,
        title: "Turn-by-Turn Navigation",
        description: "Integrated GPS navigation with real-time traffic updates",
        benefits: ["Live traffic data", "Alternative routes", "Voice guidance"],
      },
      {
        icon: MessageSquare,
        title: "Customer Communication",
        description: "Direct communication channels with customers",
        benefits: ["In-app messaging", "Delivery updates", "Issue reporting"],
      },
    ],
    technical: [
      {
        icon: Shield,
        title: "Enterprise Security",
        description: "Bank-level security with encryption and access controls",
        benefits: ["Data encryption", "Role-based access", "Audit trails"],
      },
      {
        icon: Cloud,
        title: "Cloud Infrastructure",
        description: "Scalable cloud-based architecture for reliability",
        benefits: ["99.9% uptime", "Auto-scaling", "Global CDN"],
      },
      {
        icon: Database,
        title: "Real-time Database",
        description: "Live data synchronization across all devices",
        benefits: ["Instant updates", "Conflict resolution", "Data consistency"],
      },
      {
        icon: Zap,
        title: "API Integration",
        description: "Flexible APIs for custom integrations and workflows",
        benefits: ["RESTful endpoints", "Webhook events", "SDK support"],
      },
    ],
  }

  const benefits = [
    {
      icon: TrendingUp,
      title: "Increase Efficiency",
      description: "Reduce delivery times by up to 40% with optimized routes",
      stat: "40%",
    },
    {
      icon: Clock,
      title: "Save Time",
      description: "Automate manual processes and streamline operations",
      stat: "60%",
    },
    {
      icon: Shield,
      title: "Improve Accuracy",
      description: "Eliminate errors with digital verification systems",
      stat: "95%",
    },
    {
      icon: Globe,
      title: "Scale Globally",
      description: "Support for multiple regions and languages",
      stat: "∞",
    },
  ]

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

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Powerful Features
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Discover the comprehensive tools and capabilities that make DeliveryOS the ultimate delivery management
            platform
          </p>
        </div>

        {/* Feature Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 mb-8">
            <TabsTrigger
              value="core"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-300"
            >
              Core Features
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300"
            >
              Admin Tools
            </TabsTrigger>
            <TabsTrigger
              value="driver"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Driver App
            </TabsTrigger>
            <TabsTrigger
              value="technical"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-300"
            >
              Technical
            </TabsTrigger>
          </TabsList>

          {Object.entries(features).map(([category, categoryFeatures]) => (
            <TabsContent key={category} value={category} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoryFeatures.map((feature, index) => (
                  <Card
                    key={index}
                    className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:transform hover:scale-[1.02]"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-600/20 to-blue-600/20">
                          <feature.icon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                          <CardDescription className="text-slate-400">{feature.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {feature.benefits.map((benefit, benefitIndex) => (
                          <div key={benefitIndex} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-slate-300 text-sm">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Key Benefits Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose DeliveryOS?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Transform your delivery operations with measurable results and proven performance improvements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border-slate-700/50 text-center"
              >
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20">
                      <benefit.icon className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{benefit.stat}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-slate-400 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-cyan-500/30 backdrop-blur-xl">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                Join thousands of businesses already using DeliveryOS to streamline their delivery operations and
                improve customer satisfaction.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-3">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/user-manual">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-3 bg-transparent"
                  >
                    View Documentation
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
