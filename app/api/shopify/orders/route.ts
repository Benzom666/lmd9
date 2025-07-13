import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { shopifyIntegration } from "@/lib/shopify-integration"
import { logError } from "@/lib/error-handler"

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("connectionId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const sinceId = searchParams.get("sinceId")
    const status = searchParams.get("status") as "open" | "closed" | "cancelled" | "any"
    const financialStatus = searchParams.get("financialStatus")
    const fulfillmentStatus = searchParams.get("fulfillmentStatus")
    const createdAtMin = searchParams.get("createdAtMin")
    const createdAtMax = searchParams.get("createdAtMax")
    const fields = searchParams.get("fields")?.split(",")

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 })
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabaseServiceRole
      .from("shopify_connections")
      .select("*")
      .eq("id", connectionId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    if (!connection.is_active) {
      return NextResponse.json({ error: "Connection is not active" }, { status: 400 })
    }

    // Fetch orders from Shopify
    const result = await shopifyIntegration.fetchOrders(connection.shop_domain, connection.access_token, {
      limit,
      sinceId: sinceId || undefined,
      status: status || "any",
      financialStatus: financialStatus || undefined,
      fulfillmentStatus: fulfillmentStatus || undefined,
      createdAtMin: createdAtMin || undefined,
      createdAtMax: createdAtMax || undefined,
      fields: fields || undefined,
    })

    return NextResponse.json({
      success: true,
      orders: result.orders,
      hasMore: result.hasMore,
      nextPageInfo: result.nextPageInfo,
      total: result.orders.length,
    })
  } catch (error) {
    console.error("Error fetching Shopify orders:", error)
    logError(error, { endpoint: "shopify_orders_fetch" })
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { connectionId, syncToDatabase = false } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 })
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabaseServiceRole
      .from("shopify_connections")
      .select("*")
      .eq("id", connectionId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Fetch recent orders
    const result = await shopifyIntegration.fetchOrders(connection.shop_domain, connection.access_token, {
      limit: 100,
      status: "any",
    })

    let syncResult = null
    if (syncToDatabase) {
      syncResult = await shopifyIntegration.syncOrdersToDatabase(connection.admin_id, connectionId, result.orders)

      // Update connection sync stats
      await supabaseServiceRole
        .from("shopify_connections")
        .update({
          last_sync: new Date().toISOString(),
          orders_synced: connection.orders_synced + syncResult.synced,
        })
        .eq("id", connectionId)
    }

    return NextResponse.json({
      success: true,
      orders: result.orders,
      total: result.orders.length,
      syncResult,
    })
  } catch (error) {
    console.error("Error syncing Shopify orders:", error)
    logError(error, { endpoint: "shopify_orders_sync" })
    return NextResponse.json(
      {
        error: "Failed to sync orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
