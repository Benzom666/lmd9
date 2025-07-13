import { supabase, type Order } from "@/lib/supabase"
import { logError } from "@/lib/error-handler"

export interface OrderWithDetails extends Order {
  driver_name?: string
  shop_domain?: string
  shopify_order_number?: string
  is_shopify_order?: boolean
}

export interface ShopifyConnection {
  id: string
  shop_domain: string
  is_active: boolean
  orders_synced: number
  last_sync: string
}

/**
 * Fetches all Shopify connections for a given admin.
 * @param adminId - The UUID of the admin user.
 * @returns A promise that resolves to an array of Shopify connections.
 */
export async function getShopifyConnections(adminId: string): Promise<ShopifyConnection[]> {
  try {
    const { data, error } = await supabase
      .from("shopify_connections")
      .select("id, shop_domain, is_active, orders_synced, last_sync")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    logError(error, { context: "getShopifyConnections", adminId })
    return []
  }
}

/**
 * Fetches all orders for an admin, enriched with driver and Shopify details.
 * @param adminId - The UUID of the admin user.
 * @returns A promise that resolves to an array of orders with details.
 */
export async function getOrdersWithDetails(adminId: string): Promise<OrderWithDetails[]> {
  try {
    // Fetch all necessary data in parallel
    const [ordersRes, connectionsRes, driversRes] = await Promise.all([
      supabase.from("orders").select("*").eq("created_by", adminId).order("created_at", { ascending: false }),
      supabase.from("shopify_connections").select("id, shop_domain").eq("admin_id", adminId),
      supabase.from("user_profiles").select("user_id, first_name, last_name").eq("role", "driver"),
    ])

    if (ordersRes.error) throw ordersRes.error
    if (connectionsRes.error) throw connectionsRes.error
    if (driversRes.error) throw driversRes.error

    const ordersData = ordersRes.data || []
    const connectionsData = connectionsRes.data || []
    const driversData = driversRes.data || []

    // Create maps for efficient lookups
    const connectionMap = new Map(connectionsData.map((c) => [c.id, c.shop_domain]))
    const driverMap = new Map(driversData.map((d) => [d.user_id, `${d.first_name || ""} ${d.last_name || ""}`.trim()]))

    // Combine data
    const ordersWithDetails = ordersData.map((order) => {
      const shopDomain = connectionMap.get(order.shopify_connection_id) || null
      return {
        ...order,
        driver_name: order.driver_id ? driverMap.get(order.driver_id) || "Unknown Driver" : "Unassigned",
        shop_domain: shopDomain,
        is_shopify_order: !!order.shopify_order_id,
        shopify_order_number: order.shopify_order_id ? `#${order.shopify_order_id}` : undefined,
      }
    })

    console.log(
      `📦 Loaded ${ordersWithDetails.length} orders (${ordersWithDetails.filter((o) => o.is_shopify_order).length} from Shopify)`,
    )
    return ordersWithDetails
  } catch (error) {
    logError(error, { context: "getOrdersWithDetails", adminId })
    return []
  }
}

/**
 * Deletes a single order by its ID.
 * @param orderId - The UUID of the order to delete.
 * @returns A promise that resolves when the operation is complete.
 */
export async function deleteOrder(orderId: string) {
  try {
    const { error } = await supabase.from("orders").delete().eq("id", orderId)
    if (error) throw error
  } catch (error) {
    logError(error, { context: "deleteOrder", orderId })
    throw new Error("Failed to delete order.")
  }
}
