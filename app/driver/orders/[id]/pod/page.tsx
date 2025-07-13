"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DriverDashboardLayout } from "@/components/driver-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { supabase, type Order } from "@/lib/supabase"
import { ArrowLeft, Camera, User, Package, MapPin, CheckCircle, X, FileImage, Loader2 } from "lucide-react"

interface CapturedPhoto {
  id: string
  url: string
  preview: string
  file?: File
  type: string
  description?: string
}

export default function PodPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [signature, setSignature] = useState("")
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const orderId = params.id as string

  useEffect(() => {
    if (orderId && profile) {
      fetchOrderData()
      getCurrentLocation()
    }
  }, [orderId, profile])

  const fetchOrderData = async () => {
    if (!profile) return

    try {
      setLoading(true)

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("driver_id", profile.user_id)
        .single()

      if (orderError) throw orderError

      setOrder(orderData as Order)
      setCustomerName(orderData.customer_name || "")

      // Check if order is ready for POD
      if (orderData.status !== "in_transit" && orderData.status !== "out_for_delivery") {
        toast({
          title: "Invalid Order Status",
          description: "This order is not ready for proof of delivery.",
          variant: "destructive",
        })
        router.push(`/driver/orders/${orderId}`)
        return
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive",
      })
      router.push("/driver/orders")
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          console.log("Location captured:", position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error("Error getting location:", error)
          toast({
            title: "Location Error",
            description: "Could not get current location. Delivery will proceed without location data.",
            variant: "destructive",
          })
        },
      )
    }
  }

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          const newPhoto: CapturedPhoto = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            url: result,
            preview: result,
            file: file,
            type: "delivery",
            description: `Delivery photo ${photos.length + 1}`,
          }
          setPhotos((prev) => [...prev, newPhoto])
          console.log("Photo captured:", {
            id: newPhoto.id,
            size: file.size,
            type: file.type,
            urlLength: result.length,
          })
        }
        reader.readAsDataURL(file)
      }
    })

    // Reset the input
    event.target.value = ""
  }

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile || !order) {
      toast({
        title: "Error",
        description: "Missing required data. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    if (!customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Please enter the name of the person who received the delivery.",
        variant: "destructive",
      })
      return
    }

    if (photos.length === 0) {
      toast({
        title: "Photo Required",
        description: "Please take at least one photo as proof of delivery.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      console.log("Submitting POD with data:", {
        orderId,
        driverId: profile.user_id,
        customerName,
        photosCount: photos.length,
        hasSignature: !!signature,
        hasLocation: !!location,
        notesLength: deliveryNotes.length,
      })

      // Prepare completion data
      const completionData = {
        customerName: customerName.trim(),
        notes: deliveryNotes.trim() || null,
        signature: signature || null,
        location: location,
        photos: photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          preview: photo.preview,
          type: photo.type,
          description: photo.description,
          file: {
            size: photo.file?.size || photo.url.length,
            type: photo.file?.type || "image/jpeg",
            name: photo.file?.name || `photo-${photo.id}.jpg`,
          },
        })),
      }

      console.log("Completion data prepared:", {
        ...completionData,
        photos: completionData.photos.map((p) => ({
          id: p.id,
          type: p.type,
          urlLength: p.url.length,
          fileSize: p.file.size,
        })),
      })

      // Submit to API
      const response = await fetch("/api/driver/complete-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          driverId: profile.user_id,
          completionData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete delivery")
      }

      console.log("POD submission successful:", result)

      toast({
        title: "Delivery Completed",
        description: `Order ${order.order_number} has been marked as delivered successfully.`,
      })

      // Redirect to POD view page
      router.push(`/driver/orders/${orderId}/pod-view`)
    } catch (error) {
      console.error("Error completing delivery:", error)
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to complete delivery. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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
            <p>Loading order details...</p>
          </div>
        </div>
      </DriverDashboardLayout>
    )
  }

  if (!order) {
    return (
      <DriverDashboardLayout title="Order Not Found">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Order not found or not assigned to you.</p>
          <Button onClick={() => router.push("/driver/orders")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </DriverDashboardLayout>
    )
  }

  return (
    <DriverDashboardLayout title="Proof of Delivery">
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Proof of Delivery</h1>
            <p className="text-muted-foreground">Order #{order.order_number}</p>
          </div>
          <Badge variant="outline" className="ml-auto">
            <Package className="mr-1 h-3 w-3" />
            {order.status}
          </Badge>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                <p className="font-medium">{order.delivery_address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customer_phone || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* POD Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Recipient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Name of person who received delivery *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter recipient's name"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Capture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photo Evidence *
              </CardTitle>
              <CardDescription>Take photos of the delivered package and delivery location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Photo Upload */}
                <div>
                  <Label htmlFor="photoCapture" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium">Take Photos</p>
                      <p className="text-xs text-muted-foreground">Tap to capture delivery photos</p>
                    </div>
                  </Label>
                  <Input
                    id="photoCapture"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </div>

                {/* Photo Preview */}
                {photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Captured Photos ({photos.length})</p>
                    <div className="grid grid-cols-2 gap-4">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative">
                          <img
                            src={photo.preview || "/placeholder.svg"}
                            alt={`Delivery photo ${photo.id}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Badge className="absolute bottom-2 left-2 text-xs">{photo.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Delivery Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="deliveryNotes">Additional notes (optional)</Label>
                <Textarea
                  id="deliveryNotes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any additional delivery details, special instructions followed, etc."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Info */}
          {location && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || photos.length === 0} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Delivery
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DriverDashboardLayout>
  )
}
