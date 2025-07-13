"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderManagementDashboard } from "@/components/shopify/order-management-dashboard"
import { ConnectionSetupWizard } from "@/components/shopify/connection-setup-wizard"
import { AnalyticsDashboard } from "@/components/shopify/analytics-dashboard"
import { ShopifySyncMonitor } from "@/components/shopify-sync-monitor"

export default function ShopifyIntegrationPage() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Order Management</TabsTrigger>
          <TabsTrigger value="setup">Setup & Connections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="monitoring">Sync Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrderManagementDashboard />
        </TabsContent>

        <TabsContent value="setup">
          <ConnectionSetupWizard />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="monitoring">
          <ShopifySyncMonitor />
        </TabsContent>
      </Tabs>
    </div>
  )
}
