import { createClient } from "@supabase/supabase-js"
import { logError } from "./error-handler"

// Enhanced Shopify API client with comprehensive error handling and caching
export class ShopifyIntegrationService {
  private supabase: any
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  // Cache management
  private getCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }

  // Enhanced Shopify API request with retry logic and rate limiting
  async makeShopifyRequest(
    shopDomain: string,
    accessToken: string,
    endpoint: string,
    options: {
      method?: string
      body?: any
      params?: Record<string, any>
      retries?: number
      useCache?: boolean
    } = {},
  ): Promise<any> {
    const { method = "GET", body, params, retries = 3, useCache = true } = options

    // Build URL with parameters
    const url = new URL(`https://${shopDomain}/admin/api/2023-10/${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    // Check cache for GET requests
    const cacheKey = this.getCacheKey(`${method}_${url.toString()}`, body)
    if (method === "GET" && useCache) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log(`📋 Cache hit for ${endpoint}`)
        return cached
      }
    }

    // Make request with retry logic
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Shopify API ${method} ${endpoint} (attempt ${attempt}/${retries})`)

        const fetchOptions: RequestInit = {
          method,
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
            "User-Agent": "DeliveryOS/1.0",
          },
        }

        if (body && method !== "GET") {
          fetchOptions.body = JSON.stringify(body)
        }

        const response = await fetch(url.toString(), fetchOptions)

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "2")
          console.log(`⏳ Rate limited, waiting ${retryAfter}s before retry...`)
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
          continue
        }

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Shopify API error (${response.status}): ${errorText}`)
        }

        const data = await response.json()

        // Cache successful GET requests
        if (method === "GET" && useCache) {
          this.setCache(cacheKey, data)
        }

        console.log(`✅ Shopify API success on attempt ${attempt}`)
        return data
      } catch (error) {
        console.error(`❌ Shopify API attempt ${attempt} failed:`, error)

        if (attempt === retries) {
          logError(error, { shopDomain, endpoint, method, attempt })
          throw error
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  // Fetch orders with comprehensive filtering and pagination
  async fetchOrders(
    shopDomain: string,
    accessToken: string,
    options: {
      limit?: number
      sinceId?: string
      createdAtMin?: string
      createdAtMax?: string
      updatedAtMin?: string
      updatedAtMax?: string
      status?: "open" | "closed" | "cancelled" | "any"
      financialStatus?: string
      fulfillmentStatus?: string
      fields?: string[]
    } = {},
  ): Promise<{ orders: any[]; hasMore: boolean; nextPageInfo?: string }> {
    const {
      limit = 50,
      sinceId,
      createdAtMin,
      createdAtMax,
      updatedAtMin,
      updatedAtMax,
      status = "any",
      financialStatus,
      fulfillmentStatus,
      fields,
    } = options

    const params: Record<string, any> = {
      limit: Math.min(limit, 250), // Shopify max is 250
      status,
    }

    if (sinceId) params.since_id = sinceId
    if (createdAtMin) params.created_at_min = createdAtMin
    if (createdAtMax) params.created_at_max = createdAtMax
    if (updatedAtMin) params.updated_at_min = updatedAtMin
    if (updatedAtMax) params.updated_at_max = updatedAtMax
    if (financialStatus) params.financial_status = financialStatus
    if (fulfillmentStatus) params.fulfillment_status = fulfillmentStatus
    if (fields && fields.length > 0) params.fields = fields.join(",")

    const data = await this.makeShopifyRequest(shopDomain, accessToken, "orders.json", {
      params,
    })

    const orders = data.orders || []
    const hasMore = orders.length === params.limit
    const nextPageInfo = hasMore && orders.length > 0 ? orders[orders.length - 1].id : undefined

    return { orders, hasMore, nextPageInfo }
  }

  // Fetch single order with full details
  async fetchOrder(shopDomain: string, accessToken: string, orderId: string): Promise<any> {
    const data = await this.makeShopifyRequest(shopDomain, accessToken, `orders/${orderId}.json`)
    return data.order
  }

  // Update order fulfillment status
  async fulfillOrder(
    shopDomain: string,
    accessToken: string,
    orderId: string,
    fulfillmentData: {
      locationId?: string
      trackingNumber?: string
      trackingCompany?: string
      trackingUrls?: string[]
      notifyCustomer?: boolean
      lineItems?: Array<{ id: string; quantity: number }>
    },
  ): Promise<any> {
    const {
      locationId,
      trackingNumber,
      trackingCompany,
      trackingUrls,
      notifyCustomer = true,
      lineItems,
    } = fulfillmentData

    const fulfillment: any = {
      notify_customer: notifyCustomer,
    }

    if (locationId) fulfillment.location_id = locationId
    if (trackingNumber) fulfillment.tracking_number = trackingNumber
    if (trackingCompany) fulfillment.tracking_company = trackingCompany
    if (trackingUrls) fulfillment.tracking_urls = trackingUrls
    if (lineItems) fulfillment.line_items = lineItems

    const data = await this.makeShopifyRequest(shopDomain, accessToken, `orders/${orderId}/fulfillments.json`, {
      method: "POST",
      body: { fulfillment },
      useCache: false,
    })

    return data.fulfillment
  }

  // Cancel fulfillment
  async cancelFulfillment(
    shopDomain: string,
    accessToken: string,
    orderId: string,
    fulfillmentId: string,
  ): Promise<any> {
    const data = await this.makeShopifyRequest(
      shopDomain,
      accessToken,
      `orders/${orderId}/fulfillments/${fulfillmentId}/cancel.json`,
      {
        method: "POST",
        useCache: false,
      },
    )

    return data.fulfillment
  }

  // Update tracking information
  async updateTracking(
    shopDomain: string,
    accessToken: string,
    orderId: string,
    fulfillmentId: string,
    trackingInfo: {
      trackingNumber?: string
      trackingCompany?: string
      trackingUrls?: string[]
      notifyCustomer?: boolean
    },
  ): Promise<any> {
    const { trackingNumber, trackingCompany, trackingUrls, notifyCustomer = true } = trackingInfo

    const fulfillment: any = {
      notify_customer: notifyCustomer,
    }

    if (trackingNumber) fulfillment.tracking_number = trackingNumber
    if (trackingCompany) fulfillment.tracking_company = trackingCompany
    if (trackingUrls) fulfillment.tracking_urls = trackingUrls

    const data = await this.makeShopifyRequest(
      shopDomain,
      accessToken,
      `orders/${orderId}/fulfillments/${fulfillmentId}.json`,
      {
        method: "PUT",
        body: { fulfillment },
        useCache: false,
      },
    )

    return data.fulfillment
  }

  // Test connection to Shopify
  async testConnection(
    shopDomain: string,
    accessToken: string,
  ): Promise<{ success: boolean; shop?: any; error?: string }> {
    try {
      const data = await this.makeShopifyRequest(shopDomain, accessToken, "shop.json", {
        retries: 1,
        useCache: false,
      })

      return { success: true, shop: data.shop }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      }
    }
  }

  // Get shop information
  async getShopInfo(shopDomain: string, accessToken: string): Promise<any> {
    const data = await this.makeShopifyRequest(shopDomain, accessToken, "shop.json")
    return data.shop
  }

  // Sync orders to local database
  async syncOrdersToDatabase(
    adminId: string,
    connectionId: string,
    orders: any[],
  ): Promise<{ synced: number; created: number; updated: number; errors: any[] }> {
    let synced = 0
    let created = 0
    let updated = 0
    const errors: any[] = []

    for (const order of orders) {
      try {
        // Check if order already exists
        const { data: existingOrder } = await this.supabase
          .from("shopify_orders")
          .select("id")
          .eq("shopify_order_id", order.id.toString())
          .eq("shopify_connection_id", connectionId)
          .single()

        const orderData = {
          shopify_connection_id: connectionId,
          shopify_order_id: order.id.toString(),
          order_number: order.order_number || order.name,
          customer_name: order.customer
            ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
            : "Unknown",
          customer_email: order.customer?.email || null,
          customer_phone: order.customer?.phone || null,
          shipping_address: order.shipping_address || {},
          billing_address: order.billing_address || {},
          line_items: order.line_items || [],
          total_price: order.total_price || "0.00",
          subtotal_price: order.subtotal_price || "0.00",
          total_tax: order.total_tax || "0.00",
          currency: order.currency || "USD",
          financial_status: order.financial_status || "pending",
          fulfillment_status: order.fulfillment_status || "unfulfilled",
          tags: order.tags || "",
          note: order.note || null,
          created_at: order.created_at,
          updated_at: order.updated_at,
          synced_at: new Date().toISOString(),
        }

        if (existingOrder) {
          // Update existing order
          const { error } = await this.supabase.from("shopify_orders").update(orderData).eq("id", existingOrder.id)

          if (error) throw error
          updated++
        } else {
          // Create new order
          const { error } = await this.supabase.from("shopify_orders").insert(orderData)

          if (error) throw error
          created++
        }

        synced++
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error)
        errors.push({ orderId: order.id, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    return { synced, created, updated, errors }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
    console.log("🗑️ Shopify integration cache cleared")
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Export singleton instance
export const shopifyIntegration = new ShopifyIntegrationService()
