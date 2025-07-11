'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  Users, 
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { joinBusinessByInvitation, getBusinessInvitationDetails } from '../../dashboard/settings/actions'

interface BusinessInvitation {
  id: string
  businessId: string
  businessName: string
  email: string
  status: string
  createdAt: string
  expiresAt: string
}

export default function BusinessJoinPage() {
  const t = useI18n()
  const searchParams = useSearchParams()
  
  // State
  const [invitation, setInvitation] = useState<BusinessInvitation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get invitation token from URL
  const invitationToken = searchParams.get('invitation')

  useEffect(() => {
    if (invitationToken) {
      loadInvitationDetails()
    } else {
      setError('No invitation token provided')
      setIsLoading(false)
    }
  }, [invitationToken])

  const loadInvitationDetails = async () => {
    if (!invitationToken) return

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getBusinessInvitationDetails(invitationToken)
      if (result.success && result.invitation) {
        setInvitation(result.invitation)
      } else {
        setError(result.error || 'Failed to load invitation details')
      }
    } catch (error) {
      console.error('Error loading invitation details:', error)
      setError('Failed to load invitation details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinBusiness = async () => {
    if (!invitationToken || !invitation) return

    setIsJoining(true)
    try {
      const result = await joinBusinessByInvitation(invitationToken)
      if (result.success) {
        toast.success('Successfully joined business')
        // Redirect to business dashboard after successful join
        setTimeout(() => {
          window.location.href = `/business/dashboard/${invitation.businessId}`
        }, 1500)
      } else {
        toast.error(result.error || 'Failed to join business')
      }
    } catch (error) {
      console.error('Error joining business:', error)
              toast.error('Failed to join business')
    } finally {
      setIsJoining(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'accepted':
        return <Badge variant="default" className="bg-green-500">Accepted</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">Loading invitation details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Invalid Invitation</CardTitle>
              <CardDescription>
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/business/manage'}
                className="w-full"
              >
                Go to Business Management
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Invitation Not Found</CardTitle>
              <CardDescription>
                The invitation you're looking for doesn't exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/business/manage'}
                className="w-full"
              >
                Go to Business Management
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isExpired = new Date(invitation.expiresAt) < new Date()
  const canJoin = invitation.status === 'pending' && !isExpired

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Business Invitation</h1>
          <p className="text-muted-foreground">
            You've been invited to join a business team
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-xl">{invitation.businessName}</CardTitle>
                <CardDescription>
                  Business invitation details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Invitation Status */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(invitation.status)}
                <div>
                  <p className="font-medium">Invitation Status</p>
                  <p className="text-sm text-muted-foreground">
                    {invitation.status === 'pending' && !isExpired 
                      ? 'Ready to join' 
                      : invitation.status === 'pending' && isExpired
                      ? 'Invitation has expired'
                      : invitation.status === 'accepted'
                      ? 'Already accepted'
                      : 'Unknown status'
                    }
                  </p>
                </div>
              </div>
              {getStatusBadge(invitation.status)}
            </div>

            <Separator />

            {/* Invitation Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Invitation Details</h3>
              
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Invited Email</span>
                  <span className="font-medium">{invitation.email}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Invited On</span>
                  <span className="text-sm">{formatDate(invitation.createdAt)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expires On</span>
                  <span className={cn(
                    "text-sm",
                    isExpired ? "text-red-500" : "text-green-500"
                  )}>
                    {formatDate(invitation.expiresAt)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action */}
            <div className="text-center">
              {canJoin ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Click the button below to join this business team. You'll have access to shared analytics and team features.
                  </p>
                  <Button 
                    onClick={handleJoinBusiness} 
                    disabled={isJoining}
                    size="lg"
                    className="w-full"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining Business...
                      </>
                    ) : (
                      <>
                        Join Business
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <XCircle className="h-5 w-5" />
                    <span>
                      {invitation.status === 'accepted' 
                        ? 'You have already accepted this invitation'
                        : isExpired
                        ? 'This invitation has expired'
                        : 'This invitation is no longer valid'
                      }
                    </span>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/business/manage'}
                    className="w-full"
                  >
                    Go to Business Management
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
