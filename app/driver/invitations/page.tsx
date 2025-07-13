"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Send, X, Clock, UserPlus, CheckCircle, Plus } from "lucide-react"

interface Invitation {
  id: string
  type: string
  inviter_email: string
  target_email: string
  message: string | null
  status: string
  created_at: string
  responded_at: string | null
}

export default function DriverInvitationsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [sendInviteOpen, setSendInviteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    adminEmail: "",
    message: "",
  })

  const fetchInvitations = async (retryCount = 0) => {
    if (!profile?.user_id) return

    try {
      setLoading(true)
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
      }
      const response = await fetch(`/api/invitations?userId=${profile.user_id}`)
      if (!response.ok) {
        if (response.status === 429 && retryCount < 3) {
          return fetchInvitations(retryCount + 1)
        }
        throw new Error(`Failed to fetch invitations: ${response.status}`)
      }
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error("Error fetching invitations:", error)
      toast({
        title: "Connection Error",
        description: "Unable to load invitations.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.user_id) {
      fetchInvitations()
    }
  }, [profile?.user_id])

  const sendInvitation = async () => {
    if (!profile?.user_id || !inviteForm.adminEmail) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "driver_to_admin",
          email: inviteForm.adminEmail,
          inviterUserId: profile.user_id,
          message: inviteForm.message || null,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send invitation")
      }
      toast({
        title: "Request Sent",
        description: `Your request has been sent to ${inviteForm.adminEmail}.`,
      })
      setSendInviteOpen(false)
      fetchInvitations()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const respondToInvitation = async (invitationId: string, action: "accept" | "reject") => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action} invitation`)
      }
      toast({
        title: `Invitation ${action === "accept" ? "Accepted" : "Rejected"}`,
      })
      fetchInvitations()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      accepted: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    }
    const Icon = status === "pending" ? Clock : status === "accepted" ? CheckCircle : X
    return (
      <Badge variant="outline" className={statusStyles[status as keyof typeof statusStyles]}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const sentInvitations = invitations.filter((inv) => inv.type === "driver_to_admin")
  const receivedInvitations = invitations.filter((inv) => inv.type === "admin_to_driver")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Invitations</h1>
          <p className="text-muted-foreground mt-1">Connect with admins to manage your team assignments.</p>
        </div>
        <Dialog open={sendInviteOpen} onOpenChange={setSendInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Team Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Team Assignment</DialogTitle>
              <DialogDescription>Send a request to an admin to join their delivery team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                value={inviteForm.adminEmail}
                onChange={(e) => setInviteForm({ ...inviteForm, adminEmail: e.target.value })}
                placeholder="Admin Email Address"
              />
              <Textarea
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                placeholder="Personal Message (Optional)"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendInvitation} disabled={submitting || !inviteForm.adminEmail}>
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send /> Sent Requests
            </CardTitle>
            <CardDescription>Requests you've sent to admins.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : sentInvitations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No requests sent yet.</p>
            ) : (
              <div className="space-y-4">
                {sentInvitations.map((inv) => (
                  <div key={inv.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{inv.target_email}</span>
                      {getStatusBadge(inv.status)}
                    </div>
                    {inv.message && (
                      <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">{inv.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Sent: {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus /> Received Invitations
            </CardTitle>
            <CardDescription>Invitations from admins to join their teams.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : receivedInvitations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No invitations received.</p>
            ) : (
              <div className="space-y-4">
                {receivedInvitations.map((inv) => (
                  <div key={inv.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{inv.inviter_email}</span>
                      {getStatusBadge(inv.status)}
                    </div>
                    {inv.message && (
                      <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">{inv.message}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Received: {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                      {inv.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => respondToInvitation(inv.id, "accept")}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => respondToInvitation(inv.id, "reject")}>
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
