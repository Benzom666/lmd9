"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DriverDashboardLayout } from "@/components/driver-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase, type Order } from "@/lib/supabase"
import {
  ArrowLeft,
  Camera,
  User,
  Package,
  Clock,
  CheckCircle,
  Download,
  Eye,
  MapPin,
  AlertTriangle,
  FileText,
  X,
  RefreshCw,
} from "lucide-react"

interface ProofOfDelivery {
  id: string
  order_id: string
  driver_id: string
  delivery_timestamp: string
  recipient_name: string
  recipient_signature: string | null
  delivery_notes: string | null
  location_latitude: number | null
  location_longitude: number | null
  created_at: string
}

interface PodPhoto {
  id: string
  pod_id: string
  photo_url: string
  photo_type: string
  description: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
}

interface DeliveryFailure {
  id: string
  order_id: string
  driver_id: string
  failure_reason: string
  notes: string | null
  attempted_delivery: boolean
  contacted_customer: boolean
  left_at_location: boolean
  reschedule_requested: boolean
  reschedule_date: string | null
  location: string | null
  photos: string
  created_at: string
}

export default function PodViewPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [pod, setPod] = useState<ProofOfDelivery | null>(null)
  const [photos, setPhotos] = useState<PodPhoto[]>([])
  const [failureData, setFailureData] = useState<DeliveryFailure | null>(null)
  const [legacyPhotos, setLegacyPhotos] = useState<string[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const orderId = params.id as string

  useEffect(() => {
    if (orderId && profile) {
      fetchPodData()
    }
  }, [orderId, profile])

  const fetchPodData = async () => {
    if (!profile) return

    try {
      setLoading(true)
      console.log("Fetching POD data for order:", orderId)

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()

      if (orderError) {
        console.error("Order fetch error:", orderError)
        throw orderError
      }

      console.log("Order data:", orderData)
      setOrder(orderData as Order)

      // Check if order is completed
      if (orderData.status !== "delivered" && orderData.status !== "failed") {
        toast({
          title: "Order Not Completed",
          description: "This order has not been completed yet.",
          variant: "destructive",
        })
        router.push(`/driver/orders/${orderId}`)
        return
      }

      // Initialize debug info
      const debug: any = {
        orderId,
        orderStatus: orderData.status,
        hasPhotoUrl: !!orderData.photo_url,
        photoUrlLength: orderData.photo_url ? orderData.photo_url.length : 0,
        photoUrlType: typeof orderData.photo_url,
        podFound: false,
        podPhotosCount: 0,
        failureFound: false,
        legacyPhotosCount: 0,
      }

      // Handle successful delivery
      if (orderData.status === "delivered") {
        console.log("Fetching POD data for delivered order...")

        // Try to fetch POD data from new structure
        const { data: podData, error: podError } = await supabase
          .from("proof_of_delivery")
          .select("*")
          .eq("order_id", orderId)
          .single()

        if (podData && !podError) {
          console.log("POD data found:", podData)
          setPod(podData)
          debug.podFound = true

          // Fetch associated photos
          const { data: photoData, error: photoError } = await supabase
            .from("pod_photos")
            .select("*")
            .eq("pod_id", podData.id)
            .order("created_at", { ascending: true })

          if (photoData && !photoError) {
            console.log("POD photos found:", photoData.length)
            setPhotos(photoData)
            debug.podPhotosCount = photoData.length
          } else {
            console.log("No POD photos found or error:", photoError)
          }
        } else {
          console.log("No POD data found or error:", podError)
        }
      }

      // Handle failed delivery
      if (orderData.status === "failed") {
        console.log("Fetching failure data for failed order...")

        const { data: failureData, error: failureError } = await supabase
          .from("delivery_failures")
          .select("*")
          .eq("order_id", orderId)
          .single()

        if (failureData && !failureError) {
          console.log("Failure data found:", failureData)
          setFailureData(failureData)
          debug.failureFound = true
        } else {
          console.log("No failure data found or error:", failureError)
        }
      }

      // Check for legacy photos in order.photo_url
      if (orderData.photo_url) {
        console.log("Processing legacy photos from order.photo_url:", orderData.photo_url)

        try {
          // Try to parse as JSON first
          let parsedPhotos: string[] = []

          if (orderData.photo_url.startsWith("[") || orderData.photo_url.startsWith("{")) {
            // Looks like JSON
            const parsed = JSON.parse(orderData.photo_url)
            if (Array.isArray(parsed)) {
              parsedPhotos = parsed.filter((url) => typeof url === "string" && url.length > 0)
            } else if (typeof parsed === "string") {
              parsedPhotos = [parsed]
            }
          } else {
            // Treat as single URL
            parsedPhotos = [orderData.photo_url]
          }

          console.log("Parsed legacy photos:", parsedPhotos)
          setLegacyPhotos(parsedPhotos)
          debug.legacyPhotosCount = parsedPhotos.length
        } catch (error) {
          console.error("Error parsing legacy photos:", error)
          // If parsing fails, treat as single URL
          setLegacyPhotos([orderData.photo_url])
          debug.legacyPhotosCount = 1
        }
      }

      setDebugInfo(debug)
      console.log("Debug info:", debug)
    } catch (error) {
      console.error("Error fetching POD data:", error)
      toast({
        title: "Error",
        description: "Failed to load proof of delivery data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadPhoto = (photoUrl: string, filename: string) => {
    try {
      // For base64 images, create a download link
      if (photoUrl.startsWith("data:")) {
        const link = document.createElement("a")
        link.href = photoUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // For regular URLs, open in new tab
        window.open(photoUrl, "_blank")
      }
    } catch (error) {
      console.error("Error downloading photo:", error)
      toast({
        title: "Download Error",
        description: "Failed to download photo. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openPhotoModal = (photoUrl: string) => {
    setSelectedPhoto(photoUrl)
  }

  const closePhotoModal = () => {
    setSelectedPhoto(null)
  }

  const parseFailurePhotos = (photosJson: string): string[] => {
    try {
      const photos = JSON.parse(photosJson)
      return Array.isArray(photos) ? photos.filter((url) => typeof url === "string" && url.length > 0) : []
    } catch {
      return []
    }
  }

  if (!profile) {
    return (
      <DriverDashboardLayout title="Authentication Required">
        <div className="text-center py-8">
          <p>Please log in to access this page.</p>
        </div>
      </DriverDashboardLayout>
    )
  }

  if (loading) {
    return (
      <DriverDashboardLayout title="Loading...">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading proof of delivery...</p>
          </div>
        </div>
      </DriverDashboardLayout>
    )
  }

  if (!order) {
    return (
      <DriverDashboardLayout title="Order Not Found">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Order not found.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DriverDashboardLayout>
    )
  }

  // Combine all photos for display
  const allPhotos = [
    ...photos.map((p) => ({
      url: p.photo_url,
      type: p.photo_type,
      description: p.description,
      id: p.id,
      source: "pod_photos",
    })),
    ...legacyPhotos.map((url, index) => ({
      url,
      type: "legacy",
      description: null,
      id: `legacy-${index}`,
      source: "legacy",
    })),
  ]

  // Get failure photos if this is a failed delivery
  const failurePhotos = failureData ? parseFailurePhotos(failureData.photos) : []
  const allFailurePhotos = [
    ...failurePhotos.map((url, index) => ({
      url,
      type: "evidence",
      description: "Delivery attempt evidence",
      id: `failure-${index}`,
      source: "failure",
    })),
    ...legacyPhotos.map((url, index) => ({
      url,
      type: "legacy",
      description: null,
      id: `legacy-failure-${index}`,
      source: "legacy",
    })),
  ]

  const displayPhotos = order.status === "delivered" ? allPhotos : allFailurePhotos
  const hasPhotos = displayPhotos.length > 0

  return (
    <DriverDashboardLayout title={order.status === "delivered" ? "Proof of Delivery" : "Delivery Failure Report"}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {order.status === "delivered" ? "Proof of Delivery" : "Delivery Failure Report"}
            </h1>
            <p className="text-muted-foreground">Order #{order.order_number}</p>
          </div>
          <Badge variant={order.status === "delivered" ? "default" : "destructive"} className="ml-auto">
            {order.status === "delivered" ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Delivered
              </>
            ) : (
              <>
                <AlertTriangle className="mr-1 h-3 w-3" />
                Failed
              </>
            )}
          </Badge>
        </div>

        {/* Debug Info (only show in development) */}
        {process.env.NODE_ENV === "development" && debugInfo && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={order.status === "delivered" ? "default" : "destructive"}>
                  {order.status === "delivered" ? "Delivered" : "Failed"}
                </Badge>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                <p className="font-medium">{order.delivery_address}</p>
              </div>
              {(order.completed_at || pod?.delivery_timestamp) && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                  <p className="font-medium">
                    {new Date(pod?.delivery_timestamp || order.completed_at || "").toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Successful Delivery Details */}
        {order.status === "delivered" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pod ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Received By
                    </p>
                    <p className="font-medium">{pod.recipient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Delivery Time
                    </p>
                    <p className="font-medium">{new Date(pod.delivery_timestamp).toLocaleString()}</p>
                  </div>
                  {pod.location_latitude && pod.location_longitude && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pod.location_latitude.toFixed(6)}, {pod.location_longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                  {pod.recipient_signature && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Signature</p>
                      <p className="text-sm text-green-600">Captured</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Legacy delivery record - limited details available</p>
                </div>
              )}

              {pod?.delivery_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Notes</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{pod.delivery_notes}</p>
                </div>
              )}

              {pod?.recipient_signature && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Customer Signature</p>
                  <div
                    className="border rounded-lg p-4 bg-white max-w-md"
                    dangerouslySetInnerHTML={{ __html: pod.recipient_signature }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Failed Delivery Details */}
        {order.status === "failed" && failureData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Failure Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failure Reason</p>
                  <p className="font-medium text-red-700">{failureData.failure_reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reported At
                  </p>
                  <p className="font-medium">{new Date(failureData.created_at).toLocaleString()}</p>
                </div>
                {failureData.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </p>
                    <p className="text-xs text-muted-foreground">{failureData.location}</p>
                  </div>
                )}
              </div>

              {/* Attempt Details */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Delivery Attempt Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div
                    className={`flex items-center gap-2 ${failureData.attempted_delivery ? "text-green-600" : "text-gray-500"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${failureData.attempted_delivery ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    Attempted delivery
                  </div>
                  <div
                    className={`flex items-center gap-2 ${failureData.contacted_customer ? "text-green-600" : "text-gray-500"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${failureData.contacted_customer ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    Contacted customer
                  </div>
                  <div
                    className={`flex items-center gap-2 ${failureData.left_at_location ? "text-green-600" : "text-gray-500"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${failureData.left_at_location ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    Left notice
                  </div>
                  <div
                    className={`flex items-center gap-2 ${failureData.reschedule_requested ? "text-green-600" : "text-gray-500"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${failureData.reschedule_requested ? "bg-green-500" : "bg-gray-300"}`}
                    />
                    Reschedule requested
                  </div>
                </div>
              </div>

              {failureData.reschedule_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requested Reschedule Date</p>
                  <p className="text-sm">{new Date(failureData.reschedule_date).toLocaleString()}</p>
                </div>
              )}

              {failureData.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Additional Details</p>
                  <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">{failureData.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photo Evidence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {order.status === "delivered" ? "Photo Evidence" : "Evidence Photos"}
              <Button variant="ghost" size="sm" onClick={fetchPodData} className="ml-auto">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              {hasPhotos
                ? `${displayPhotos.length} photo${displayPhotos.length !== 1 ? "s" : ""} captured during ${order.status === "delivered" ? "delivery" : "delivery attempt"}`
                : `No photos available for this ${order.status === "delivered" ? "delivery" : "delivery attempt"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPhotos ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {displayPhotos.map((photo, index) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.url || "/placeholder.svg"}
                        alt={`${order.status === "delivered" ? "Delivery" : "Evidence"} photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openPhotoModal(photo.url)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          console.error("Image failed to load:", photo.url)
                          target.src = "/placeholder.svg"
                        }}
                        onLoad={() => {
                          console.log("Image loaded successfully:", photo.url.substring(0, 50) + "...")
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <Badge className="absolute top-2 left-2 text-xs">
                        {photo.type === "legacy" ? "Legacy" : photo.type}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadPhoto(photo.url, `${order.status}-photo-${index + 1}.jpg`)
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      {photo.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate" title={photo.description}>
                          {photo.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Download All Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      displayPhotos.forEach((photo, index) => {
                        setTimeout(() => {
                          downloadPhoto(photo.url, `${order.status}-photo-${index + 1}.jpg`)
                        }, index * 500)
                      })
                      toast({
                        title: "Download Started",
                        description: `Downloading ${displayPhotos.length} photos...`,
                      })
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download All Photos ({displayPhotos.length})
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No photos available for this {order.status === "delivered" ? "delivery" : "delivery attempt"}
                </p>
                {debugInfo && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p>
                      Debug: Legacy photos: {debugInfo.legacyPhotosCount}, POD photos: {debugInfo.podPhotosCount}
                    </p>
                    <p>Photo URL exists: {debugInfo.hasPhotoUrl ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <Button variant="outline" onClick={() => router.push(`/driver/orders/${orderId}`)} className="flex-1">
            <FileText className="mr-2 h-4 w-4" />
            View Order Details
          </Button>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closePhotoModal}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPhoto || "/placeholder.svg"}
              alt="Full size photo"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button variant="secondary" size="icon" className="absolute top-4 right-4" onClick={closePhotoModal}>
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4"
              onClick={() => downloadPhoto(selectedPhoto, "delivery-photo-full.jpg")}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      )}
    </DriverDashboardLayout>
  )
}
