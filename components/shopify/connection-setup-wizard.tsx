"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ShoppingBag, CheckCircle, Copy, ExternalLink, Settings, Zap, Shield, Globe } from "lucide-react"

interface ConnectionSettings {
  auto_create_orders: boolean
  auto_assign_drivers: boolean
  sync_order_status: boolean
  notification_emails: string[]
  fulfillment_service: boolean
}

export function ConnectionSetupWizard() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    shopDomain: "",
    accessToken: "",
    webhookSecret: "",
  })

  const [settings, setSettings] = useState<ConnectionSettings>({
    auto_create_orders: true,
    auto_assign_drivers: false,
    sync_order_status: true,
    notification_emails: [],
    fulfillment_service: true,
  })

  const [connectionResult, setConnectionResult] = useState<any>(null)

  const steps = [
    {
      id: 1,
      title: "Store Credentials",
      description: "Enter your Shopify store details",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    {
      id: 2,
      title: "Test Connection",
      description: "Verify your store connection",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      id: 3,
      title: "Configure Settings",
      description: "Set up integration preferences",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      id: 4,
      title: "Complete Setup",
      description: "Finalize your integration",
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ]

  const testConnection = async () => {
    if (!formData.shopDomain || !formData.accessToken) {
      toast({
        title: "Missing Information",
        description: "Please enter both shop domain and access token",
        variant: "destructive",
      })
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch("/api/shopify/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: formData.shopDomain,
          accessToken: formData.accessToken,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setConnectionResult(result)
        toast({
          title: "Connection Successful",
          description: `Connected to ${result.shop.name}`,
        })
        setCurrentStep(3)
      } else {
        throw new Error(result.error || "Connection test failed")
      }
    } catch (error) {
      console.error("Connection test error:", error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Shopify",
        variant: "destructive",
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const createConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/shopify/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("supabase.auth.token")}`,
        },
        body: JSON.stringify({
          shopDomain: formData.shopDomain,
          accessToken: formData.accessToken,
          webhookSecret: formData.webhookSecret,
          settings,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Integration Complete",
          description: "Your Shopify store has been successfully connected",
        })
        setCurrentStep(4)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create connection")
      }
    } catch (error) {
      console.error("Connection creation error:", error)
      toast({
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "Failed to complete setup",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/shopify`
    navigator.clipboard.writeText(webhookUrl)
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Shopify Integration Setup</CardTitle>
          <CardDescription>Connect your Shopify store in a few simple steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${currentStep > step.id ? "bg-primary" : "bg-muted-foreground"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-medium">{steps[currentStep - 1]?.title}</h3>
            <p className="text-muted-foreground">{steps[currentStep - 1]?.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Tabs value={currentStep.toString()} className="space-y-6">
        {/* Step 1: Store Credentials */}
        <TabsContent value="1" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Store Credentials</CardTitle>
              <CardDescription>Provide your Shopify store domain and API access token</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shop-domain">Shop Domain *</Label>
                <Input
                  id="shop-domain"
                  placeholder="your-store.myshopify.com"
                  value={formData.shopDomain}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shopDomain: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your full Shopify domain (e.g., your-store.myshopify.com)
                </p>
              </div>

              <div>
                <Label htmlFor="access-token">Admin API Access Token *</Label>
                <Input
                  id="access-token"
                  type="password"
                  placeholder="shpat_..."
                  value={formData.accessToken}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accessToken: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Your private app's Admin API access token (starts with "shpat_")
                </p>
              </div>

              <div>
                <Label htmlFor="webhook-secret">Webhook Secret (Optional)</Label>
                <Input
                  id="webhook-secret"
                  placeholder="webhook_secret_key"
                  value={formData.webhookSecret}
                  onChange={(e) => setFormData((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">Optional webhook secret for enhanced security</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setCurrentStep(2)} disabled={!formData.shopDomain || !formData.accessToken}>
                  Next: Test Connection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("https://help.shopify.com/en/manual/apps/private-apps", "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Setup Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Test Connection */}
        <TabsContent value="2" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Connection</CardTitle>
              <CardDescription>Verify that we can connect to your Shopify store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Store Domain:</span>
                    <span>{formData.shopDomain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Access Token:</span>
                    <span>{"*".repeat(20)}...</span>
                  </div>
                </div>
              </div>

              {connectionResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Connection Successful</span>
                  </div>
                  <div className="space-y-1 text-sm text-green-700">
                    <div>Store: {connectionResult.shop.name}</div>
                    <div>Email: {connectionResult.shop.email}</div>
                    <div>Currency: {connectionResult.shop.currency}</div>
                    <div>Plan: {connectionResult.shop.plan_name}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={testConnection} disabled={testingConnection}>
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                {connectionResult && <Button onClick={() => setCurrentStep(3)}>Next: Configure Settings</Button>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Configure Settings */}
        <TabsContent value="3" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>Configure how the integration should behave</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-create-orders">Auto-create Delivery Orders</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create delivery orders for new Shopify orders
                    </p>
                  </div>
                  <Switch
                    id="auto-create-orders"
                    checked={settings.auto_create_orders}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, auto_create_orders: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-assign-drivers">Auto-assign Drivers</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign available drivers to new delivery orders
                    </p>
                  </div>
                  <Switch
                    id="auto-assign-drivers"
                    checked={settings.auto_assign_drivers}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, auto_assign_drivers: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sync-order-status">Sync Order Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically update Shopify fulfillment status when orders are delivered
                    </p>
                  </div>
                  <Switch
                    id="sync-order-status"
                    checked={settings.sync_order_status}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, sync_order_status: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="fulfillment-service">Enable Fulfillment Service</Label>
                    <p className="text-sm text-muted-foreground">
                      Register as a fulfillment service in Shopify for advanced integration
                    </p>
                  </div>
                  <Switch
                    id="fulfillment-service"
                    checked={settings.fulfillment_service}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, fulfillment_service: checked }))}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Webhook Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Webhook URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={`${window.location.origin}/api/webhooks/shopify`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add this URL to your Shopify webhook settings for real-time order sync
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createConnection} disabled={loading}>
                  {loading ? "Creating..." : "Create Connection"}
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Complete */}
        <TabsContent value="4" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Setup Complete!</CardTitle>
              <CardDescription>Your Shopify integration is now ready to use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Integration Successful</h3>
                  <p className="text-muted-foreground">Your Shopify store is now connected to DeliveryOS</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-medium">Real-time Sync</h4>
                  <p className="text-sm text-muted-foreground">Orders sync automatically from Shopify</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h4 className="font-medium">Secure Connection</h4>
                  <p className="text-sm text-muted-foreground">Your data is protected with encryption</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <h4 className="font-medium">Auto Fulfillment</h4>
                  <p className="text-sm text-muted-foreground">Fulfillment status updates automatically</p>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={() => (window.location.href = "/admin/integrations/shopify")}>
                  Go to Order Management
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/admin/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
