"use client"
import { useState, useEffect, useMemo } from "react"
import { useDebounce } from "use-debounce"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw } from "lucide-react"
import type { ShopifyConnection } from "@/lib/data/orders"

export interface OrderFiltersState {
  searchTerm: string
  status: string
  priority: string
  driverId: string
  store: string
}

interface OrderFiltersProps {
  drivers: Array<{ id: string; name: string }>
  connections: ShopifyConnection[]
  onFilterChange: (filters: OrderFiltersState) => void
  onRefresh: () => void
}

export function OrderFilters({ drivers, connections, onFilterChange, onRefresh }: OrderFiltersProps) {
  const [filters, setFilters] = useState<OrderFiltersState>({
    searchTerm: "",
    status: "all",
    priority: "all",
    driverId: "all",
    store: "all",
  })
  const [debouncedSearchTerm] = useDebounce(filters.searchTerm, 300)

  useEffect(() => {
    onFilterChange({ ...filters, searchTerm: debouncedSearchTerm })
  }, [debouncedSearchTerm])

  const handleFilterChange = (key: keyof OrderFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const storeOptions = useMemo(() => {
    return connections.map((c) => ({
      value: c.shop_domain,
      label: c.shop_domain.split(".")[0],
    }))
  }, [connections])

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers, addresses..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => handleFilterChange("priority", v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.store} onValueChange={(v) => handleFilterChange("store", v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="manual">Manual Orders</SelectItem>
                <SelectItem value="shopify">All Shopify</SelectItem>
                {storeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.driverId} onValueChange={(v) => handleFilterChange("driverId", v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
