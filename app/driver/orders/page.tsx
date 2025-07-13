"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, SlidersHorizontal, Package, CheckCircle, XCircle, Send, MapPin } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type Order = {
  id: string
  customer_name: string
  delivery_address: string
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed"
  created_at: string
  // Add other order fields as necessary
}

export default function DriverOrdersPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchOrders = async () => {
      if (!profile) return

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("driver_id", profile.user_id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching orders:", error)
          throw new Error(error.message)
        }

        setOrders(data as Order[])
      } catch (error) {
        console.error("Error in fetchOrders:", error)
        toast({
          title: "Error",
          description: "Failed to load your orders.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (profile) {
      fetchOrders()
    }
  }, [profile, toast])

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm.toLowerCase()),
    )
  }, [orders, searchTerm])

  const activeOrders = filteredOrders.filter((order) => ["assigned", "in_transit"].includes(order.status))
  const doneOrders = filteredOrders.filter((order) => order.status === "delivered")
  const failedOrders = filteredOrders.filter((order) => order.status === "failed")

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <Link href={`/driver/orders/${order.id}`} className="block">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
            </div>
            <Badge
              variant={
                order.status === "delivered" ? "default" : order.status === "failed" ? "destructive" : "secondary"
              }
            >
              {order.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{new Date(order.created_at).toLocaleString()}</p>
        </Link>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 pb-24">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Route Status</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Standard</div>
            <p className="text-xs text-muted-foreground">No optimizations applied</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex justify-between items-center">
          <Button variant="outline" className="gap-2 bg-transparent">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <MapPin className="h-4 w-4" />
            <span>Located</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-2">
            <Package className="h-4 w-4" /> Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="done" className="gap-2">
            <CheckCircle className="h-4 w-4" /> Done ({doneOrders.length})
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-2">
            <XCircle className="h-4 w-4" /> Failed ({failedOrders.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4 space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : activeOrders.length > 0 ? (
            activeOrders.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <p className="text-center text-muted-foreground py-8">No active orders.</p>
          )}
        </TabsContent>
        <TabsContent value="done" className="mt-4 space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : doneOrders.length > 0 ? (
            doneOrders.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <p className="text-center text-muted-foreground py-8">No completed orders.</p>
          )}
        </TabsContent>
        <TabsContent value="failed" className="mt-4 space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : failedOrders.length > 0 ? (
            failedOrders.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <p className="text-center text-muted-foreground py-8">No failed orders.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
