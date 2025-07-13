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

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params
    const {
      connectionId,
      trackingNumber,
      trackingCompany,
      trackingUrls,
      notifyCustomer = true,
      lineItems,
      locationId,
    } = await request.json()

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

    // Fulfill the order in Shopify
    const fulfillment = await shopifyIntegration.fulfillOrder(
      connection.shop_domain,
      connection.access_token,
      orderId,
      {
        locationId,
        trackingNumber,
        trackingCompany,
        trackingUrls,
        notifyCustomer,
        lineItems,
      },
    )

    // Update local database if order exists
    const { data: localOrder } = await supabaseServiceRole
      .from("shopify_orders")
      .select("id")
      .eq("shopify_order_id", orderId)
      .eq("shopify_connection_id", connectionId)
      .single()

    if (localOrder) {
      await supabaseServiceRole
        .from("shopify_orders")
        .update({
          fulfillment_status: "fulfilled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", localOrder.id)
    }

    return NextResponse.json({
      success: true,
      fulfillment,
      message: "Order fulfilled successfully",
    })
  } catch (error) {
    console.error("Error fulfilling Shopify order:", error)
    logError(error, { endpoint: "shopify_fulfill_order", orderId: params.orderId })
    return NextResponse.json(
      {
        error: "Failed to fulfill order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
