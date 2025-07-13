import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")

  if (!orderId) {
    return NextResponse.json({ error: "orderId parameter required" }, { status: 400 })
  }

  try {
    const debugInfo: any = {
      orderId,
      timestamp: new Date().toISOString(),
    }

    // Check order data
    const { data: orderData, error: orderError } = await supabaseServiceRole
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    debugInfo.order = {
      found: !orderError,
      error: orderError?.message,
      data: orderData
        ? {
            id: orderData.id,
            order_number: orderData.order_number,
            status: orderData.status,
            driver_id: orderData.driver_id,
            customer_name: orderData.customer_name,
            has_photo_url: !!orderData.photo_url,
            photo_url_length: orderData.photo_url ? orderData.photo_url.length : 0,
            photo_url_type: typeof orderData.photo_url,
            photo_url_preview: orderData.photo_url ? orderData.photo_url.substring(0, 100) + "..." : null,
            completed_at: orderData.completed_at,
            created_at: orderData.created_at,
            updated_at: orderData.updated_at,
          }
        : null,
    }

    // Check POD data
    const { data: podData, error: podError } = await supabaseServiceRole
      .from("proof_of_delivery")
      .select("*")
      .eq("order_id", orderId)
      .single()

    debugInfo.pod = {
      found: !podError,
      error: podError?.message,
      data: podData
        ? {
            id: podData.id,
            recipient_name: podData.recipient_name,
            delivery_timestamp: podData.delivery_timestamp,
            has_signature: !!podData.recipient_signature,
            has_notes: !!podData.delivery_notes,
            has_location: !!(podData.location_latitude && podData.location_longitude),
          }
        : null,
    }

    // Check POD photos
    if (podData) {
      const { data: photoData, error: photoError } = await supabaseServiceRole
        .from("pod_photos")
        .select("*")
        .eq("pod_id", podData.id)
        .order("created_at", { ascending: true })

      debugInfo.podPhotos = {
        found: !photoError,
        error: photoError?.message,
        count: photoData ? photoData.length : 0,
        data: photoData
          ? photoData.map((photo) => ({
              id: photo.id,
              photo_type: photo.photo_type,
              description: photo.description,
              file_size: photo.file_size,
              mime_type: photo.mime_type,
              photo_url_length: photo.photo_url ? photo.photo_url.length : 0,
              photo_url_preview: photo.photo_url ? photo.photo_url.substring(0, 50) + "..." : null,
              created_at: photo.created_at,
            }))
          : null,
      }
    }

    // Check delivery failures
    const { data: failureData, error: failureError } = await supabaseServiceRole
      .from("delivery_failures")
      .select("*")
      .eq("order_id", orderId)
      .single()

    debugInfo.deliveryFailure = {
      found: !failureError,
      error: failureError?.message,
      data: failureData
        ? {
            id: failureData.id,
            failure_reason: failureData.failure_reason,
            has_photos: !!failureData.photos,
            photos_length: failureData.photos ? failureData.photos.length : 0,
            photos_preview: failureData.photos ? failureData.photos.substring(0, 100) + "..." : null,
            created_at: failureData.created_at,
          }
        : null,
    }

    // Check order updates
    const { data: updateData, error: updateError } = await supabaseServiceRole
      .from("order_updates")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(5)

    debugInfo.orderUpdates = {
      found: !updateError,
      error: updateError?.message,
      count: updateData ? updateData.length : 0,
      data: updateData
        ? updateData.map((update) => ({
            id: update.id,
            status: update.status,
            notes: update.notes ? update.notes.substring(0, 100) + "..." : null,
            has_photo_url: !!update.photo_url,
            photo_url_length: update.photo_url ? update.photo_url.length : 0,
            created_at: update.created_at,
          }))
        : null,
    }

    // Parse legacy photos if they exist
    if (orderData?.photo_url) {
      try {
        let parsedPhotos: string[] = []
        if (orderData.photo_url.startsWith("[") || orderData.photo_url.startsWith("{")) {
          const parsed = JSON.parse(orderData.photo_url)
          if (Array.isArray(parsed)) {
            parsedPhotos = parsed.filter((url) => typeof url === "string" && url.length > 0)
          } else if (typeof parsed === "string") {
            parsedPhotos = [parsed]
          }
        } else {
          parsedPhotos = [orderData.photo_url]
        }

        debugInfo.legacyPhotos = {
          count: parsedPhotos.length,
          photos: parsedPhotos.map((url, index) => ({
            index,
            length: url.length,
            type: url.startsWith("data:") ? "base64" : "url",
            preview: url.substring(0, 50) + "...",
          })),
        }
      } catch (error) {
        debugInfo.legacyPhotos = {
          error: "Failed to parse photo_url",
          raw_length: orderData.photo_url.length,
          raw_preview: orderData.photo_url.substring(0, 100) + "...",
        }
      }
    }

    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch debug information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
