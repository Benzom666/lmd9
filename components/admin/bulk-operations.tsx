"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { generateBulkLabels } from "@/lib/label-utils"
import { Upload, Download, UserCheck, Edit, Printer, Trash2, Info } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { OrderWithDetails } from "@/lib/data/orders"

interface BulkOperationsProps {
  selectedOrders: Set<string>
  allOrders: OrderWithDetails[]
  drivers: Array<{ id: string; name: string }>
  onActionComplete: () => void
  onShowInstructions: () => void
  adminId: string
}

interface BulkUploadResult {
  imported: number
  total_processed: number
  validation_errors?: string[]
  insert_errors?: string[]
}

export function BulkOperations({
  selectedOrders,
  allOrders,
  drivers,
  onActionComplete,
  onShowInstructions,
  adminId,
}: BulkOperationsProps) {
  const { toast } = useToast()
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("")
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("adminId", adminId)

    setUploadProgress(0)
    setUploadStatus("Uploading file...")
    setShowBulkUpload(true)
    setUploadResult(null)
    setBulkActionLoading(true)

    try {
      const response = await fetch("/api/upload-orders", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Upload failed")

      setUploadStatus("Upload completed successfully!")
      setUploadResult(result)
      toast({
        title: "Upload Successful",
        description: `${result.imported} orders imported successfully`,
      })
      onActionComplete()
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus("Upload failed")
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload orders",
        variant: "destructive",
      })
    } finally {
      setUploadProgress(100)
      setBulkActionLoading(false)
      event.target.value = ""
    }
  }

  const performBulkAction = async (action: Promise<any>, successMessage: string, errorMessage: string) => {
    if (selectedOrders.size === 0) return
    setBulkActionLoading(true)
    try {
      await action
      toast({ title: "Success", description: successMessage })
      onActionComplete()
    } catch (error) {
      console.error(errorMessage, error)
      toast({ title: "Error", description: "An error occurred. Please try again.", variant: "destructive" })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkAssignDriver = (driverId: string) => {
    const action = supabase
      .from("orders")
      .update({ driver_id: driverId, status: "assigned", assigned_at: new Date().toISOString() })
      .in("id", Array.from(selectedOrders))
    performBulkAction(action, `${selectedOrders.size} orders assigned.`, "Bulk assign error:")
  }

  const handleBulkStatusChange = (status: string) => {
    const action = supabase.from("orders").update({ status }).in("id", Array.from(selectedOrders))
    performBulkAction(action, `${selectedOrders.size} orders updated to ${status}.`, "Bulk status change error:")
  }

  const handleBulkDelete = () => {
    if (!confirm(`Are you sure you want to delete ${selectedOrders.size} orders? This action cannot be undone.`)) return
    const action = supabase.from("orders").delete().in("id", Array.from(selectedOrders))
    performBulkAction(action, `${selectedOrders.size} orders deleted.`, "Bulk delete error:")
  }

  const handleBulkPrintOrDownload = async (download: boolean) => {
    const ordersToProcess = allOrders.filter((order) => selectedOrders.has(order.id))
    const action = generateBulkLabels(ordersToProcess, download)
    const type = download ? "downloaded" : "printed"
    performBulkAction(action, `Labels for ${selectedOrders.size} orders ${type}.`, `Bulk ${type} error:`)
  }

  const exportSelectedOrders = () => {
    const ordersToExport = allOrders.filter((order) => selectedOrders.has(order.id))
    const csvHeaders = ["Order Number", "Customer Name", "Delivery Address", "Status", "Priority", "Driver", "Store"]
    const csvData = ordersToExport.map((o) => [
      o.order_number,
      o.customer_name,
      o.delivery_address,
      o.status,
      o.priority,
      o.driver_name || "Unassigned",
      o.shop_domain || "Manual",
    ])
    const csvContent = [csvHeaders, ...csvData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `orders-export-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    toast({ title: "Export Complete", description: `${ordersToExport.length} orders exported to CSV.` })
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Bulk Operations</h3>
            <p className="text-sm text-muted-foreground">Upload multiple orders or perform bulk actions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onShowInstructions} disabled={bulkActionLoading}>
              <Info className="mr-2 h-4 w-4" /> Instructions
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleBulkUpload}
              className="hidden"
              id="bulk-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("bulk-upload")?.click()}
              disabled={bulkActionLoading}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload Orders
            </Button>
            <Button
              variant="outline"
              onClick={exportSelectedOrders}
              disabled={selectedOrders.size === 0 || bulkActionLoading}
            >
              <Download className="mr-2 h-4 w-4" /> Export ({selectedOrders.size})
            </Button>
          </div>
        </div>

        {showBulkUpload && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{uploadStatus}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            {uploadResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <p>✅ {uploadResult.imported} orders imported</p>
                <p>📊 {uploadResult.total_processed} total processed</p>
              </div>
            )}
          </div>
        )}

        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-900">{selectedOrders.size} orders selected</span>
            <div className="flex gap-2 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Assign Driver
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Select Driver</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {drivers.map((d) => (
                    <DropdownMenuItem key={d.id} onClick={() => handleBulkAssignDriver(d.id)}>
                      {d.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                    <Edit className="mr-2 h-4 w-4" />
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Select Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["pending", "assigned", "in_transit", "delivered", "failed", "cancelled"].map((s) => (
                    <DropdownMenuItem key={s} onClick={() => handleBulkStatusChange(s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                    <Printer className="mr-2 h-4 w-4" />
                    Labels
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkPrintOrDownload(false)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Labels
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPrintOrDownload(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Labels
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="text-red-600 hover:text-red-700 bg-transparent"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
