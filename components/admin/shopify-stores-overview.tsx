"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Store, ExternalLink } from "lucide-react"
import type { ShopifyConnection } from "@/lib/data/orders"

interface ShopifyStoresOverviewProps {
  connections: ShopifyConnection[]
}

export function ShopifyStoresOverview({ connections }: ShopifyStoresOverviewProps) {
  if (connections.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Connected Shopify Stores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <div key={connection.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{connection.shop_domain}</h4>
                <Badge variant={connection.is_active ? "default" : "secondary"}>
                  {connection.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Orders synced: {connection.orders_synced || 0}</p>
                <p>Last sync: {connection.last_sync ? new Date(connection.last_sync).toLocaleDateString() : "Never"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-transparent"
                onClick={() => window.open(`https://${connection.shop_domain}/admin`, "_blank")}
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                Open Store
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
