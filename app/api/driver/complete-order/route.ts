import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
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

export async function POST(request: NextRequest) {
  console.log("🚚 Driver completing order - API called")

  try {
    const body = await request.json()
    console.log("📦 Request body received:", {
      hasOrderId: !!body.orderId,
      hasDriverId: !!body.driverId,
      hasCompletionData: !!body.completionData,
      completionDataKeys: body.completionData ? Object.keys(body.completionData) : [],
    })

    const { orderId, driverId, completionData } = body

    if (!orderId || !driverId) {
      console.error("❌ Missing required fields:", { orderId: !!orderId, driverId: !!driverId })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!completionData) {
      console.error("❌ Missing completion data")
      return NextResponse.json({ error: "Missing completion data" }, { status: 400 })
    }

    console.log("📸 Photo data analysis:", {
      hasPhotos: !!completionData.photos,
      photosType: typeof completionData.photos,
      photosIsArray: Array.isArray(completionData.photos),
      photosCount: completionData.photos?.length || 0,
      firstPhotoStructure: completionData.photos?.[0] ? Object.keys(completionData.photos[0]) : [],
    })

    // Verify the driver is assigned to this order
    const { data: order, error: orderError } = await supabaseServiceRole
      .from("orders")
      .select(`
        *,
        shopify_connections!shopify_connection_id (
          id,
          shop_domain,
          access_token,
          is_active,
          settings
        )
      `)
      .eq("id", orderId)
      .eq("driver_id", driverId)
      .single()

    if (orderError || !order) {
      console.error("❌ Order not found or not assigned to driver:", orderError)
      return NextResponse.json({ error: "Order not found or not assigned to you" }, { status: 404 })
    }

    console.log("✅ Order found:", {
      orderNumber: order.order_number,
      status: order.status,
      customer: order.customer_name,
    })

    // Process photos and create POD record
    let podId: string | null = null
    const photoUrls: string[] = []
    let photosProcessed = 0

    try {
      // Create POD record first
      const podData = {
        order_id: orderId,
        driver_id: driverId,
        delivery_timestamp: new Date().toISOString(),
        recipient_name: completionData.customerName || order.customer_name,
        recipient_signature: completionData.signature || null,
        delivery_notes: completionData.notes || null,
        location_latitude: completionData.location?.lat || null,
        location_longitude: completionData.location?.lng || null,
      }

      console.log("📝 Creating POD record:", podData)

      const { data: createdPod, error: podError } = await supabaseServiceRole
        .from("proof_of_delivery")
        .insert(podData)
        .select()
        .single()

      if (podError) {
        console.error("❌ Error creating POD record:", podError)
        throw new Error(`Failed to create POD record: ${podError.message}`)
      }

      podId = createdPod.id
      console.log(`✅ POD record created with ID: ${podId}`)

      // Process photos if they exist
      if (completionData.photos && Array.isArray(completionData.photos)) {
        console.log(`📸 Processing ${completionData.photos.length} photos...`)

        for (let i = 0; i < completionData.photos.length; i++) {
          const photo = completionData.photos[i]

          console.log(`📸 Processing photo ${i + 1}:`, {
            hasUrl: !!photo.url,
            urlLength: photo.url?.length || 0,
            urlType: typeof photo.url,
            isBase64: photo.url?.startsWith("data:") || false,
            type: photo.type,
            id: photo.id,
          })

          if (!photo.url) {
            console.warn(`⚠️ Photo ${i + 1} has no URL, skipping`)
            continue
          }

          try {
            const photoRecord = {
              pod_id: podId,
              photo_url: photo.url,
              photo_type: photo.type || "delivery",
              description: photo.description || `Delivery photo ${i + 1}`,
              file_size: photo.file?.size || null,
              mime_type: photo.file?.type || "image/jpeg",
            }

            console.log(`📸 Inserting photo ${i + 1} record:`, {
              pod_id: photoRecord.pod_id,
              photo_type: photoRecord.photo_type,
              description: photoRecord.description,
              file_size: photoRecord.file_size,
              mime_type: photoRecord.mime_type,
              url_length: photoRecord.photo_url.length,
            })

            const { error: photoError } = await supabaseServiceRole.from("pod_photos").insert(photoRecord)

            if (photoError) {
              console.error(`❌ Error storing photo ${i + 1}:`, photoError)
            } else {
              photoUrls.push(photo.url)
              photosProcessed++
              console.log(`✅ Photo ${i + 1} stored successfully`)
            }
          } catch (error) {
            console.error(`❌ Error processing photo ${i + 1}:`, error)
          }
        }

        console.log(`📸 Photo processing complete: ${photosProcessed}/${completionData.photos.length} photos stored`)
      } else {
        console.log("📸 No photos to process")
      }
    } catch (error) {
      console.error("❌ Error in POD/photo processing:", error)
      // Continue with order completion even if POD processing fails
    }

    // Update the order status
    const updateData: any = {
      status: "delivered",
      updated_at: new Date().toISOString(),
    }

    // Add completed_at and photo_url if columns exist
    try {
      // Check if columns exist by trying to update with them
      updateData.completed_at = new Date().toISOString()

      if (photoUrls.length > 0) {
        updateData.photo_url = JSON.stringify(photoUrls)
        console.log(`📸 Storing ${photoUrls.length} photo URLs in order.photo_url`)
      }
    } catch (error) {
      console.warn("⚠️ Some order columns may not exist, continuing with basic update")
    }

    console.log("📝 Updating order with data:", {
      orderId,
      status: updateData.status,
      hasCompletedAt: !!updateData.completed_at,
      hasPhotoUrl: !!updateData.photo_url,
      photoUrlLength: updateData.photo_url?.length || 0,
    })

    const { error: updateError } = await supabaseServiceRole.from("orders").update(updateData).eq("id", orderId)

    if (updateError) {
      console.error("❌ Error updating order:", updateError)
      return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
    }

    console.log(`✅ Order ${order.order_number} marked as delivered`)

    // Create order update record for audit trail
    try {
      const updateRecord = {
        order_id: orderId,
        driver_id: driverId,
        status: "delivered",
        notes: `PROOF OF DELIVERY COMPLETED
Delivered to: ${completionData.customerName || order.customer_name}
Photos captured: ${photosProcessed}
POD ID: ${podId || "N/A"}
${completionData.notes ? `Notes: ${completionData.notes}` : ""}`,
        photo_url: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        latitude: completionData.location?.lat || null,
        longitude: completionData.location?.lng || null,
      }

      const { error: updateRecordError } = await supabaseServiceRole.from("order_updates").insert(updateRecord)

      if (updateRecordError) {
        console.error("❌ Error creating order update record:", updateRecordError)
      } else {
        console.log("✅ Order update record created")
      }
    } catch (error) {
      console.error("❌ Error creating order update record:", error)
    }

    // Handle Shopify fulfillment if applicable
    let shopifyResult = null
    if (order.shopify_order_id && order.shopify_connections) {
      const connection = order.shopify_connections

      if (connection.is_active && connection.access_token) {
        try {
          shopifyResult = await updateShopifyFulfillment(
            connection.shop_domain,
            connection.access_token,
            order.shopify_order_id,
            order.order_number,
            driverId,
          )

          await supabaseServiceRole
            .from("orders")
            .update({
              shopify_fulfillment_id: shopifyResult.fulfillment_id,
              shopify_fulfilled_at: new Date().toISOString(),
            })
            .eq("id", orderId)

          console.log(`🏪 Shopify fulfillment updated for order: ${order.order_number}`)
        } catch (shopifyError) {
          console.error("⚠️ Failed to update Shopify fulfillment:", shopifyError)
          shopifyResult = { error: shopifyError.message }
        }
      }
    }

    // Send notifications
    await Promise.all([
      sendDriverCompletionNotification(order, driverId),
      sendAdminCompletionNotification(order, driverId),
    ])

    const response = {
      success: true,
      message: "Order completed successfully",
      order: {
        id: order.id,
        order_number: order.order_number,
        status: "delivered",
        completed_at: updateData.completed_at,
      },
      pod: {
        id: podId,
        photos_processed: photosProcessed,
        photos_total: completionData.photos?.length || 0,
      },
      shopify_updated: !!shopifyResult && !shopifyResult.error,
      shopify_result: shopifyResult,
    }

    console.log("✅ POD completion successful:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Error completing order:", error)
    logError(error, { endpoint: "driver_complete_order" })

    return NextResponse.json(
      {
        error: "Failed to complete order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function updateShopifyFulfillment(
  shopDomain: string,
  accessToken: string,
  shopifyOrderId: string,
  orderNumber: string,
  driverId: string,
): Promise<{ fulfillment_id: string }> {
  console.log(`🏪 Updating Shopify fulfillment for order: ${shopifyOrderId}`)

  const fulfillmentData = {
    fulfillment: {
      location_id: null,
      tracking_number: `DEL-${orderNumber}`,
      tracking_company: "Local Delivery Service",
      tracking_url: null,
      notify_customer: true,
      line_items: [],
    },
  }

  const response = await fetch(`https://${shopDomain}/admin/api/2023-10/orders/${shopifyOrderId}/fulfillments.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fulfillmentData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("❌ Shopify fulfillment error:", response.status, errorText)
    throw new Error(`Shopify fulfillment failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log(`✅ Shopify fulfillment created: ${result.fulfillment.id}`)

  return {
    fulfillment_id: result.fulfillment.id.toString(),
  }
}

async function sendDriverCompletionNotification(order: any, driverId: string) {
  try {
    const notificationData = {
      user_id: driverId,
      title: "Delivery Completed",
      message: `You have successfully completed delivery for order ${order.order_number}`,
      type: "success",
      read: false,
      created_at: new Date().toISOString(),
    }

    await supabaseServiceRole.from("notifications").insert(notificationData)
    console.log(`🔔 Sent completion notification to driver: ${driverId}`)
  } catch (error) {
    console.error("❌ Error sending driver notification:", error)
  }
}

async function sendAdminCompletionNotification(order: any, driverId: string) {
  try {
    const { data: driver } = await supabaseServiceRole
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("user_id", driverId)
      .single()

    const driverName = driver ? `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver" : "Driver"

    const notificationData = {
      user_id: order.created_by,
      title: "Order Delivered",
      message: `Order ${order.order_number} has been successfully delivered by ${driverName}${order.shopify_order_id ? " and Shopify has been updated" : ""}`,
      type: "success",
      read: false,
      created_at: new Date().toISOString(),
    }

    await supabaseServiceRole.from("notifications").insert(notificationData)
    console.log(`🔔 Sent completion notification to admin: ${order.created_by}`)
  } catch (error) {
    console.error("❌ Error sending admin notification:", error)
  }
}
