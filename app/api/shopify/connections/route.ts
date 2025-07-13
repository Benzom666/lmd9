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
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get user from auth header
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Fetch connections for this user
    const { data: connections, error: connectionsError } = await supabaseServiceRole
      .from("shopify_connections")
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false })

    if (connectionsError) {
      throw connectionsError
    }

    return NextResponse.json({
      success: true,
      connections: connections || [],
    })
  } catch (error) {
    console.error("Error fetching Shopify connections:", error)
    logError(error, { endpoint: "shopify_connections_fetch" })
    return NextResponse.json(
      {
        error: "Failed to fetch connections",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { shopDomain, accessToken, webhookSecret, settings = {} } = await request.json()

    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: "Shop domain and access token are required" }, { status: 400 })
    }

    // Get user from auth header
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // Test connection first
    const testResult = await shopifyIntegration.testConnection(shopDomain, accessToken)
    if (!testResult.success) {
      return NextResponse.json({ error: "Connection test failed", details: testResult.error }, { status: 400 })
    }

    // Get shop info
    const shopInfo = testResult.shop

    // Create connection record
    const connectionData = {
      admin_id: user.id,
      shop_domain: shopDomain,
      access_token: accessToken,
      webhook_secret: webhookSecret || null,
      shop_name: shopInfo.name,
      shop_email: shopInfo.email,
      shop_currency: shopInfo.currency,
      shop_timezone: shopInfo.timezone,
      is_active: true,
      settings: {
        auto_create_orders: settings.auto_create_orders || false,
        auto_assign_drivers: settings.auto_assign_drivers || false,
        sync_order_status: settings.sync_order_status || true,
        notification_emails: settings.notification_emails || [],
        fulfillment_service: settings.fulfillment_service || false,
        ...settings,
      },
      last_sync: null,
      orders_synced: 0,
    }

    const { data: connection, error: connectionError } = await supabaseServiceRole
      .from("shopify_connections")
      .insert(connectionData)
      .select()
      .single()

    if (connectionError) {
      throw connectionError
    }

    return NextResponse.json({
      success: true,
      connection,
      message: "Shopify connection created successfully",
    })
  } catch (error) {
    console.error("Error creating Shopify connection:", error)
    logError(error, { endpoint: "shopify_connections_create" })
    return NextResponse.json(
      {
        error: "Failed to create connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
