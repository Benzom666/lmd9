"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import DeliveryMap from "@/components/delivery-map"
import { OrderTemplateGenerator } from "@/components/order-template-generator"
import { OrdersList } from "@/components/admin/orders-list"
import { ShopifyStoresOverview } from "@/components/admin/shopify-stores-overview"
import { BulkOperations } from "@/components/admin/bulk-operations"
import { OrderFilters, type OrderFiltersState } from "@/components/admin/order-filters"
import {
  getOrdersWithDetails,
  getShopifyConnections,
  deleteOrder,
  type OrderWithDetails,
  type ShopifyConnection,
} from "@/lib/data/orders"
import { getDrivers } from "@/lib/data/users"
import { Package, Clock, CheckCircle, MapPin, Navigation, AlertTriangle, Truck, Plus, Store } from "lucide-react"

export default function AdminOrdersPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([])
  const [connections, setConnections] = useState<ShopifyConnection[]>([])
  const [filters, setFilters] = useState<OrderFiltersState>({
    searchTerm: "",
    status: "all",
    priority: "all",
    driverId: "all",
    store: "all",
  })

  const [activeTab, setActiveTab] = useState("all")
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [showMap, setShowMap] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const [ordersData, driversData, connectionsData] = await Promise.all([
        getOrdersWithDetails(profile.user_id),
        getDrivers(profile.user_id),
        getShopifyConnections(profile.user_id),
      ])
      setOrders(ordersData)
      setDrivers(driversData)
      setConnections(connectionsData)
    } catch (error) {
      toast({ title: "Error", description: "Failed to load page data. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [profile, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel("orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `created_by=eq.${profile.user_id}` },
        (payload) => {
          console.log("🔔 Real-time change received:", payload)
          toast({ title: "Orders Updated", description: "The order list has been updated in real-time." })
          fetchData()
        },
      )
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [profile, toast, fetchData])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const { searchTerm, status, priority, driverId, store } = filters
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        order.order_number.toLowerCase().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        order.delivery_address.toLowerCase().includes(searchLower) ||
        (order.driver_name && order.driver_name.toLowerCase().includes(searchLower)) ||
        (order.shop_domain && order.shop_domain.toLowerCase().includes(searchLower))

      const matchesStatus = status === "all" || order.status === status
      const matchesPriority = priority === "all" || order.priority === priority
      const matchesDriver =
        driverId === "all" || order.driver_id === driverId || (driverId === "unassigned" && !order.driver_id)
      const matchesStore =
        store === "all" ||
        (store === "manual" && !order.is_shopify_order) ||
        (store === "shopify" && order.is_shopify_order) ||
        (order.shop_domain && order.shop_domain === store)

      return matchesSearch && matchesStatus && matchesPriority && matchesDriver && matchesStore
    })
  }, [orders, filters])

  const getOrdersByTab = useCallback(
    (tab: string) => {
      switch (tab) {
        case "active":
          return filteredOrders.filter((o) => !["delivered", "failed", "cancelled"].includes(o.status))
        case "completed":
          return filteredOrders.filter((o) => o.status === "delivered")
        case "failed":
          return filteredOrders.filter((o) => o.status === "failed")
        default:
          return filteredOrders
      }
    },
    [filteredOrders],
  )

  const currentTabOrders = getOrdersByTab(activeTab)

  const handleActionComplete = () => {
    setSelectedOrders(new Set())
    fetchData()
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId)
      toast({ title: "Success", description: "Order deleted successfully." })
      fetchData()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete order.", variant: "destructive" })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: Clock, label: "Pending" },
      assigned: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, label: "Assigned" },
      in_transit: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: Navigation, label: "In Transit" },
      delivered: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle, label: "Delivered" },
      failed: { color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle, label: "Failed" },
      cancelled: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: AlertTriangle, label: "Cancelled" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-gray-50",
      icon: Package,
      label: status,
    }
    return (
      <Badge variant="outline" className={config.color}>
        <config.icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const config =
      {
        urgent: "bg-red-100 text-red-800",
        high: "bg-orange-100 text-orange-800",
        normal: "bg-blue-100 text-blue-800",
        low: "bg-gray-100 text-gray-800",
      }[priority] || "bg-gray-100"
    return (
      <Badge variant="outline" className={`text-xs ${config}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  const getStoreBadge = (order: OrderWithDetails) => {
    if (order.is_shopify_order && order.shop_domain) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700">
          <Store className="mr-1 h-3 w-3" />
          {order.shop_domain.split(".")[0]}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700">
        Manual
      </Badge>
    )
  }

  if (!profile) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Multi-Store Order Management</h1>
            <p className="text-muted-foreground">Manage orders from {connections.length} stores and manual entries.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/admin/integrations")} variant="outline">
              <Store className="mr-2 h-4 w-4" />
              Manage Stores
            </Button>
            <Button onClick={() => setShowMap(true)} variant="outline">
              <MapPin className="mr-2 h-4 w-4" />
              View on Map
            </Button>
            <Button onClick={() => router.push("/admin/orders/create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        <ShopifyStoresOverview connections={connections} />
        <BulkOperations
          selectedOrders={selectedOrders}
          allOrders={orders}
          drivers={drivers}
          onActionComplete={handleActionComplete}
          onShowInstructions={() => setShowInstructions(true)}
          adminId={profile.user_id}
        />
        <OrderFilters drivers={drivers} connections={connections} onFilterChange={setFilters} onRefresh={fetchData} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              <Package className="mr-2 h-4 w-4" />
              All ({getOrdersByTab("all").length})
            </TabsTrigger>
            <TabsTrigger value="active">
              <Truck className="mr-2 h-4 w-4" />
              Active ({getOrdersByTab("active").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="mr-2 h-4 w-4" />
              Completed ({getOrdersByTab("completed").length})
            </TabsTrigger>
            <TabsTrigger value="failed">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Failed ({getOrdersByTab("failed").length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-6">
            <OrdersList
              orders={currentTabOrders}
              loading={loading}
              selectedOrders={selectedOrders}
              onSelectOrder={(orderId, checked) => {
                const newSet = new Set(selectedOrders)
                checked ? newSet.add(orderId) : newSet.delete(orderId)
                setSelectedOrders(newSet)
              }}
              onSelectAll={(checked) => {
                setSelectedOrders(checked ? new Set(currentTabOrders.map((o) => o.id)) : new Set())
              }}
              onDeleteOrder={handleDeleteOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
              getStoreBadge={getStoreBadge}
              router={router}
            />
          </TabsContent>
        </Tabs>

        {showMap && (
          <DeliveryMap
            orders={currentTabOrders.map((o) => ({
              id: o.id,
              order_number: o.order_number,
              customer_name: o.customer_name,
              delivery_address: o.delivery_address,
              priority: o.priority,
              status: o.status,
            }))}
            driverLocation={null}
            onClose={() => setShowMap(false)}
            isOptimized={false}
          />
        )}

        <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
          <DialogContent className="max-w-4xl">
            <OrderTemplateGenerator />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
