"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RefreshCw,
  Search,
  Download,
  Package,
  Truck,
  CheckCircle,
  MoreHorizontal,
  Eye,
  ExternalLink,
} from "lucide-react"

interface ShopifyOrder {
  id: string
  order_number: string
  name: string
  customer: {
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
  total_price: string
  currency: string
  financial_status: string
  fulfillment_status: string
  created_at: string
  updated_at: string
  line_items: Array<{
    id: string
    title: string
    quantity: number
    price: string
  }>
  shipping_address?: any
  tags: string
}

interface ShopifyConnection {
  id: string
  shop_domain: string
  shop_name: string
  is_active: boolean
  last_sync: string
  orders_synced: number
}

export function OrderManagementDashboard() {
  const { toast } = useToast()
  const [connections, setConnections] = useState<ShopifyConnection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<string>("")
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    status: "any_status",
    financialStatus: "",
    fulfillmentStatus: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  })

  // Pagination
  const [pagination, setPagination] = useState({
    limit: 50,
    hasMore: false,
    nextPageInfo: null as string | null,
  })

  // Fulfillment form
  const [fulfillmentData, setFulfillmentData] = useState({
    trackingNumber: "",
    trackingCompany: "",
    notifyCustomer: true,
  })

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/shopify/connections", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("supabase.auth.token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
        if (data.connections?.length > 0 && !selectedConnection) {
          setSelectedConnection(data.connections[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching connections:", error)
      toast({
        title: "Error",
        description: "Failed to fetch Shopify connections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedConnection, toast])

  // Fetch orders
  const fetchOrders = useCallback(
    async (loadMore = false) => {
      if (!selectedConnection) return

      try {
        setOrdersLoading(true)
        const params = new URLSearchParams({
          connectionId: selectedConnection,
          limit: pagination.limit.toString(),
          status: filters.status,
        })

        if (filters.financialStatus) params.append("financialStatus", filters.financialStatus)
        if (filters.fulfillmentStatus) params.append("fulfillmentStatus", filters.fulfillmentStatus)
        if (filters.dateFrom) params.append("createdAtMin", filters.dateFrom)
        if (filters.dateTo) params.append("createdAtMax", filters.dateTo)
        if (loadMore && pagination.nextPageInfo) params.append("sinceId", pagination.nextPageInfo)

        const response = await fetch(`/api/shopify/orders?${params}`)

        if (response.ok) {
          const data = await response.json()
          const newOrders = data.orders || []

          setOrders((prev) => (loadMore ? [...prev, ...newOrders] : newOrders))
          setPagination((prev) => ({
            ...prev,
            hasMore: data.hasMore,
            nextPageInfo: data.nextPageInfo,
          }))
        } else {
          throw new Error("Failed to fetch orders")
        }
      } catch (error) {
        console.error("Error fetching orders:", error)
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        })
      } finally {
        setOrdersLoading(false)
      }
    },
    [selectedConnection, filters, pagination.limit, pagination.nextPageInfo, toast],
  )

  // Fulfill order
  const fulfillOrder = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/shopify/orders/${selectedOrder.id}/fulfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionId: selectedConnection,
          ...fulfillmentData,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Order fulfilled successfully",
        })
        setFulfillDialogOpen(false)
        fetchOrders() // Refresh orders
      } else {
        throw new Error("Failed to fulfill order")
      }
    } catch (error) {
      console.error("Error fulfilling order:", error)
      toast({
        title: "Error",
        description: "Failed to fulfill order",
        variant: "destructive",
      })
    }
  }

  // Get status badge
  const getStatusBadge = (status: string, type: "financial" | "fulfillment") => {
    const colors = {
      financial: {
        paid: "bg-green-500",
        pending: "bg-yellow-500",
        refunded: "bg-red-500",
        voided: "bg-gray-500",
      },
      fulfillment: {
        fulfilled: "bg-green-500",
        partial: "bg-yellow-500",
        unfulfilled: "bg-red-500",
        null: "bg-gray-500",
      },
    }

    const colorClass = colors[type][status as keyof (typeof colors)[typeof type]] || "bg-gray-500"

    return (
      <Badge variant="secondary" className={`${colorClass} text-white`}>
        {status || "N/A"}
      </Badge>
    )
  }

  // Filter orders based on search
  const filteredOrders = orders.filter((order) => {
    if (!filters.search) return true
    const searchLower = filters.search.toLowerCase()
    return (
      order.order_number.toLowerCase().includes(searchLower) ||
      order.customer?.email?.toLowerCase().includes(searchLower) ||
      `${order.customer?.first_name} ${order.customer?.last_name}`.toLowerCase().includes(searchLower)
    )
  })

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    if (selectedConnection) {
      fetchOrders()
    }
  }, [
    selectedConnection,
    filters.status,
    filters.financialStatus,
    filters.fulfillmentStatus,
    filters.dateFrom,
    filters.dateTo,
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopify Order Management</h1>
          <p className="text-muted-foreground">Manage and fulfill your Shopify orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Connection Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Store Selection</CardTitle>
          <CardDescription>Select a Shopify store to manage orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="connection">Shopify Store</Label>
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${connection.is_active ? "bg-green-500" : "bg-red-500"}`}
                        />
                        {connection.shop_name} ({connection.shop_domain})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedConnection && (
              <div className="text-sm text-muted-foreground">
                Last sync: {connections.find((c) => c.id === selectedConnection)?.last_sync || "Never"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Order number, customer..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Order Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_status">Any Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="financial-status">Financial Status</Label>
              <Select
                value={filters.financialStatus}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, financialStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fulfillment-status">Fulfillment Status</Label>
              <Select
                value={filters.fulfillmentStatus}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, fulfillmentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="partial">Partially Fulfilled</SelectItem>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>Manage your Shopify orders and fulfillments</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">No orders match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Financial Status</TableHead>
                    <TableHead>Fulfillment Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">{order.line_items.length} items</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {order.customer?.first_name} {order.customer?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{order.customer?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {order.currency} {order.total_price}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.financial_status, "financial")}</TableCell>
                      <TableCell>{getStatusBadge(order.fulfillment_status, "fulfillment")}</TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(order.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrder(order)
                                // Open order details dialog
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {order.fulfillment_status === "unfulfilled" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setFulfillDialogOpen(true)
                                }}
                              >
                                <Truck className="mr-2 h-4 w-4" />
                                Fulfill Order
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                const connection = connections.find((c) => c.id === selectedConnection)
                                if (connection) {
                                  window.open(`https://${connection.shop_domain}/admin/orders/${order.id}`, "_blank")
                                }
                              }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View in Shopify
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.hasMore && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => fetchOrders(true)} disabled={ordersLoading}>
                    {ordersLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load More Orders
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fulfill Order Dialog */}
      <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Order</DialogTitle>
            <DialogDescription>
              Mark order {selectedOrder?.order_number} as fulfilled and optionally add tracking information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tracking-number">Tracking Number (Optional)</Label>
              <Input
                id="tracking-number"
                value={fulfillmentData.trackingNumber}
                onChange={(e) => setFulfillmentData((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                placeholder="Enter tracking number"
              />
            </div>
            <div>
              <Label htmlFor="tracking-company">Tracking Company (Optional)</Label>
              <Input
                id="tracking-company"
                value={fulfillmentData.trackingCompany}
                onChange={(e) => setFulfillmentData((prev) => ({ ...prev, trackingCompany: e.target.value }))}
                placeholder="e.g., UPS, FedEx, DHL"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notify-customer"
                checked={fulfillmentData.notifyCustomer}
                onChange={(e) => setFulfillmentData((prev) => ({ ...prev, notifyCustomer: e.target.checked }))}
              />
              <Label htmlFor="notify-customer">Notify customer via email</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={fulfillOrder}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Fulfill Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
