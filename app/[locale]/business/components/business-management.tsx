'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  Plus, 
  UserPlus, 
  UserMinus, 
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  joinBusiness, 
  leaveBusiness, 
  getUserBusinesses, 
  addManagerToBusiness, 
  removeManagerFromBusiness, 
  updateManagerAccess, 
  getUserBusinessAccess, 
  deleteBusiness, 
  renameBusiness, 
  sendBusinessInvitation, 
  getBusinessInvitations, 
  removeTraderFromBusiness, 
  cancelBusinessInvitation 
} from '@/app/[locale]/dashboard/settings/actions'

interface Business {
  id: string
  name: string
  userId: string
  traderIds: string[]
  traders: { id: string; email: string }[]
  managers: { id: string; managerId: string; access: string; email: string }[]
  createdAt: any
  updatedAt: any
  userAccess?: string
}

interface ManagedBusiness extends Business {
  userAccess: string
}

interface BusinessManagementProps {
  // Customization
  title?: string
  description?: string
  showCreateButton?: boolean
  showJoinButton?: boolean
  onBusinessClick?: (business: Business) => void
  onManageClick?: (business: Business) => void
  onViewClick?: (business: Business) => void
  createButtonText?: string
  joinButtonText?: string
  emptyStateMessage?: string
  subscriptionPrice?: string
  subscriptionFeatures?: string[]
}

export function BusinessManagement({
  title,
  description,
  showCreateButton = true,
  showJoinButton = false,
  onBusinessClick,
  onManageClick,
  onViewClick,
  createButtonText,
  joinButtonText,
  emptyStateMessage,
  subscriptionPrice = "$500/month per business",
  subscriptionFeatures = [
    'Team collaboration',
    'Shared analytics', 
    'Manager access controls',
    'Business reporting'
  ]
}: BusinessManagementProps) {
  const t = useI18n()
  
  // State
  const [userBusinesses, setUserBusinesses] = useState<{
    ownedBusinesses: Business[]
    joinedBusinesses: Business[]
  }>({ ownedBusinesses: [], joinedBusinesses: [] })
  
  const [managedBusinesses, setManagedBusinesses] = useState<ManagedBusiness[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  
  // Form states
  const [newBusinessName, setNewBusinessName] = useState('')
  const [joinBusinessId, setJoinBusinessId] = useState('')
  const [newManagerEmail, setNewManagerEmail] = useState('')
  const [newManagerAccess, setNewManagerAccess] = useState<'admin' | 'viewer'>('viewer')
  const [renameBusinessName, setRenameBusinessName] = useState('')
  const [newTraderEmail, setNewTraderEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])

  // Load data on component mount
  useEffect(() => {
    loadBusinessData()
  }, [])

  const loadBusinessData = async () => {
    setIsLoading(true)
    try {
      // Load owned and joined businesses
      const businessesResult = await getUserBusinesses()
      if (businessesResult.success) {
        setUserBusinesses({
          ownedBusinesses: businessesResult.ownedBusinesses || [],
          joinedBusinesses: businessesResult.joinedBusinesses || [],
        })
      }

      // Load managed businesses
      const managedResult = await getUserBusinessAccess()
      if (managedResult.success) {
        setManagedBusinesses(managedResult.managedBusinesses || [])
      }
    } catch (error) {
      console.error('Error loading business data:', error)
      toast.error(t('dashboard.business.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBusiness = async () => {
    if (!newBusinessName.trim()) {
      toast.error('Business name is required')
      return
    }

    setIsSubmitting(true)
    try {
      // Create a form and submit it directly to the Stripe checkout endpoint
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/stripe/create-business-checkout-session'
      
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'businessName'
      input.value = newBusinessName.trim()
      
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    } catch (error) {
      console.error('Error creating business:', error)
      toast.error(t('dashboard.business.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinBusiness = async () => {
    if (!joinBusinessId.trim()) {
      toast.error('Business ID is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await joinBusiness(joinBusinessId.trim())
      if (result.success) {
        toast.success('Joined business successfully')
        setJoinDialogOpen(false)
        setJoinBusinessId('')
        await loadBusinessData()
      } else {
        toast.error(result.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error joining business:', error)
      toast.error(t('dashboard.business.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLeaveBusiness = async (businessId: string) => {
    try {
      const result = await leaveBusiness(businessId)
      if (result.success) {
        toast.success(t('dashboard.business.leaveSuccess'))
        await loadBusinessData()
      } else {
        toast.error(result.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error leaving business:', error)
      toast.error(t('dashboard.business.error'))
    }
  }

  const handleAddManager = async () => {
    if (!newManagerEmail.trim()) {
      toast.error(t('dashboard.business.managerEmail'))
      return
    }

    if (!selectedBusiness) return

    setIsSubmitting(true)
    try {
      const result = await addManagerToBusiness(selectedBusiness.id, newManagerEmail.trim(), newManagerAccess)
      if (result.success) {
        toast.success(t('dashboard.business.managerAdded'))
        
        // Update the selected business locally
        const newManager = {
          id: `temp-${Date.now()}`, // Temporary ID
          managerId: 'temp-manager-id', // This will be updated when we reload the data
          access: newManagerAccess,
          email: newManagerEmail.trim(),
        }
        
        const updatedSelectedBusiness = {
          ...selectedBusiness,
          managers: [...selectedBusiness.managers, newManager]
        }
        setSelectedBusiness(updatedSelectedBusiness)

        // Update the businesses in the main state to keep everything in sync
        setUserBusinesses(prev => ({
          ownedBusinesses: prev.ownedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness
              : business
          ),
          joinedBusinesses: prev.joinedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness  
              : business
          )
        }))

        setManagedBusinesses(prev => 
          prev.map(business => 
            business.id === selectedBusiness.id 
              ? { ...updatedSelectedBusiness, userAccess: business.userAccess }
              : business
          )
        )
        
        setNewManagerEmail('')
        setNewManagerAccess('viewer')
        
        // Note: We don't reload data immediately to keep the dialog open
        // Data will be refreshed when the dialog is closed or when needed
      } else {
        toast.error(result.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error adding manager:', error)
      toast.error(t('dashboard.business.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveManager = async (managerId: string) => {
    if (!selectedBusiness) return

    try {
      const result = await removeManagerFromBusiness(selectedBusiness.id, managerId)
      if (result.success) {
        toast.success(t('dashboard.business.managerRemoved'))
        
        // Update the selected business locally
        const updatedSelectedBusiness = {
          ...selectedBusiness,
          managers: selectedBusiness.managers.filter(manager => manager.managerId !== managerId)
        }
        setSelectedBusiness(updatedSelectedBusiness)

        // Update the businesses in the main state to keep everything in sync
        setUserBusinesses(prev => ({
          ownedBusinesses: prev.ownedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness
              : business
          ),
          joinedBusinesses: prev.joinedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness  
              : business
          )
        }))

        setManagedBusinesses(prev => 
          prev.map(business => 
            business.id === selectedBusiness.id 
              ? { ...updatedSelectedBusiness, userAccess: business.userAccess }
              : business
          )
        )
        
        // Note: We don't reload data immediately to keep the dialog open
        // Data will be refreshed when the dialog is closed
      } else {
        toast.error(result.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error removing manager:', error)
      toast.error(t('dashboard.business.error'))
    }
  }

  const handleUpdateManagerAccess = async (managerId: string, access: 'admin' | 'viewer') => {
    if (!selectedBusiness) return

    try {
      const result = await updateManagerAccess(selectedBusiness.id, managerId, access)
      if (result.success) {
        toast.success(t('dashboard.business.accessUpdated'))
        
        // Update the selected business locally
        const updatedSelectedBusiness = {
          ...selectedBusiness,
          managers: selectedBusiness.managers.map(manager => 
            manager.managerId === managerId 
              ? { ...manager, access }
              : manager
          )
        }
        setSelectedBusiness(updatedSelectedBusiness)

        // Update the businesses in the main state to keep everything in sync
        setUserBusinesses(prev => ({
          ownedBusinesses: prev.ownedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness
              : business
          ),
          joinedBusinesses: prev.joinedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness  
              : business
          )
        }))

        setManagedBusinesses(prev => 
          prev.map(business => 
            business.id === selectedBusiness.id 
              ? { ...updatedSelectedBusiness, userAccess: business.userAccess }
              : business
          )
        )
        
        // Note: We don't reload data immediately to keep the dialog open
        // Data will be refreshed when the dialog is closed or when needed
      } else {
        toast.error(result.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error updating manager access:', error)
      toast.error(t('dashboard.business.error'))
    }
  }

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      const result = await deleteBusiness(businessId)
      if (result.success) {
        toast.success('Business deleted successfully')
        await loadBusinessData()
      } else {
        toast.error(result.error || 'Failed to delete business')
      }
    } catch (error) {
      console.error('Error deleting business:', error)
      toast.error('Failed to delete business')
    }
  }

  const handleRenameBusiness = async () => {
    if (!selectedBusiness || !renameBusinessName.trim()) {
      toast.error(t('business.rename.nameRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await renameBusiness(selectedBusiness.id, renameBusinessName.trim())
      if (result.success) {
        toast.success(t('business.rename.success'))
        
        // Update the selected business name locally
        const updatedSelectedBusiness = {
          ...selectedBusiness,
          name: renameBusinessName.trim()
        }
        setSelectedBusiness(updatedSelectedBusiness)

        // Update the businesses in the main state to keep everything in sync
        setUserBusinesses(prev => ({
          ownedBusinesses: prev.ownedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness
              : business
          ),
          joinedBusinesses: prev.joinedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness  
              : business
          )
        }))

        setManagedBusinesses(prev => 
          prev.map(business => 
            business.id === selectedBusiness.id 
              ? { ...updatedSelectedBusiness, userAccess: business.userAccess }
              : business
          )
        )
        
        // Keep the modal open and reset the rename input
        setRenameBusinessName('')
      } else {
        toast.error(result.error || t('business.rename.error'))
      }
    } catch (error) {
      console.error('Error renaming business:', error)
      toast.error(t('business.rename.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTrader = async () => {
    if (!selectedBusiness || !newTraderEmail.trim()) {
      toast.error(t('business.traders.add.emailRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await sendBusinessInvitation(selectedBusiness.id, newTraderEmail.trim())
      if (result.success) {
        toast.success(t('business.invitations.sent'))
        setNewTraderEmail('')
        // Only reload pending invitations, no need to reload all business data
        await loadPendingInvitations()
      } else {
        toast.error(result.error || t('business.traders.add.error'))
      }
    } catch (error) {
      console.error('Error adding trader:', error)
      toast.error(t('business.traders.add.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadPendingInvitations = async () => {
    if (!selectedBusiness) return
    
    try {
      const result = await getBusinessInvitations(selectedBusiness.id)
      if (result.success) {
        setPendingInvitations(result.invitations || [])
      }
    } catch (error) {
      console.error('Error loading pending invitations:', error)
    }
  }

  const handleRemoveTrader = async (traderId: string) => {
    if (!selectedBusiness) return

    try {
      const removeResult = await removeTraderFromBusiness(selectedBusiness.id, traderId)
      if (removeResult.success) {
        toast.success('Trader removed successfully')
        
        // Update the selected business locally
        const updatedSelectedBusiness = {
          ...selectedBusiness,
          traderIds: selectedBusiness.traderIds.filter(id => id !== traderId),
          traders: selectedBusiness.traders.filter(trader => trader.id !== traderId)
        }
        setSelectedBusiness(updatedSelectedBusiness)

        // Update the businesses in the main state to keep everything in sync
        setUserBusinesses(prev => ({
          ownedBusinesses: prev.ownedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness
              : business
          ),
          joinedBusinesses: prev.joinedBusinesses.map(business => 
            business.id === selectedBusiness.id 
              ? updatedSelectedBusiness  
              : business
          )
        }))

        setManagedBusinesses(prev => 
          prev.map(business => 
            business.id === selectedBusiness.id 
              ? { ...updatedSelectedBusiness, userAccess: business.userAccess }
              : business
          )
        )
      } else {
        toast.error(removeResult.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error removing trader:', error)
      toast.error(t('dashboard.business.error'))
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedBusiness) return

    try {
      const cancelResult = await cancelBusinessInvitation(selectedBusiness.id, invitationId)
      if (cancelResult.success) {
        toast.success('Invitation canceled successfully')
        await loadPendingInvitations()
      } else {
        toast.error(cancelResult.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error canceling invitation:', error)
      toast.error(t('dashboard.business.error'))
    }
  }

  const getStatusIndicator = (access: string, isOwner: boolean) => {
    if (isOwner) {
      return 'bg-yellow-500' // Gold for owner
    }
    switch (access) {
      case 'admin':
        return 'bg-blue-500' // Blue for admin
      case 'viewer':
        return 'bg-green-500' // Green for viewer
      default:
        return 'bg-muted'
    }
  }

  const getAccessLabel = (access: string, isOwner: boolean) => {
    if (isOwner) {
      return t('dashboard.business.owner')
    }
    switch (access) {
      case 'admin':
        return t('dashboard.business.admin')
      case 'viewer':
        return t('dashboard.business.viewer')
      default:
        return access
    }
  }

  const formatDate = (date: any) => {
    if (date instanceof Date) {
      return date.toLocaleDateString()
    }
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString()
    }
    return 'Unknown date'
  }

  // Deduplicate businesses to prevent showing the same business twice
  const allBusinesses = new Map<string, Business>()
  
  // Add owned businesses first (highest priority)
  userBusinesses.ownedBusinesses.forEach(business => {
    allBusinesses.set(business.id, { ...business, userAccess: 'admin' })
  })
  
  // Add joined businesses (medium priority)
  userBusinesses.joinedBusinesses.forEach(business => {
    if (!allBusinesses.has(business.id)) {
      allBusinesses.set(business.id, { ...business, userAccess: 'viewer' })
    }
  })
  
  // Add managed businesses (lowest priority - only if not already added)
  managedBusinesses.forEach(business => {
    if (!allBusinesses.has(business.id)) {
      allBusinesses.set(business.id, business)
    }
  })

  const filteredBusinesses = Array.from(allBusinesses.values())

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {(title || description) && (
        <div className="mb-8">
          {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
      )}

      {/* Businesses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBusinesses.map((business) => {
          const isOwner = userBusinesses.ownedBusinesses.some(b => b.id === business.id)
          const isJoined = userBusinesses.joinedBusinesses.some(b => b.id === business.id)
          const isManaged = managedBusinesses.some(b => b.id === business.id)
          const access = business.userAccess || (isOwner ? 'admin' : 'viewer')

          return (
            <Card key={business.id} className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "rounded-full h-2 w-2 flex-shrink-0",
                      getStatusIndicator(access, isOwner)
                    )} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm truncate">{business.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getAccessLabel(access, isOwner)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-muted-foreground">{t('dashboard.business.traders')}</span>
                  <span className="font-medium">{business.traderIds.length}</span>
                </div>
                
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-muted-foreground">{t('business.management.created')}</span>
                  <span className="text-xs">{formatDate(business.createdAt)}</span>
                </div>

                <Separator />

                <div className="flex gap-2 flex-wrap">
                  {(isOwner || access === 'admin') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={async () => {
                          setSelectedBusiness(business)
                          setRenameBusinessName(business.name)
                          setManageDialogOpen(true)
                          // Load pending invitations when dialog opens
                          setTimeout(async () => {
                            await loadPendingInvitations()
                          }, 100)
                        }}
                      >
                                              <Settings className="h-3 w-3 mr-1" />
                      {t('business.management.manage')}
                    </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          if (onViewClick) {
                            onViewClick(business)
                          } else {
                            window.location.href = `/business/dashboard/${business.id}`
                          }
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {t('business.dashboard.view')}
                      </Button>
                    </>
                  )}
                  
                  {isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1 text-xs">
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('business.management.delete')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('business.management.deleteBusiness')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('business.management.deleteConfirm').replace('{name}', business.name)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBusiness(business.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('business.management.deleteBusiness')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {(isJoined || isManaged) && !isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          <UserMinus className="h-3 w-3 mr-1" />
                          {t('business.management.leave')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('business.management.leave')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('business.management.leaveConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLeaveBusiness(business.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('business.management.leave')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Create New Business Card - only show if there's at least one business and showCreateButton is true */}
        {filteredBusinesses.length > 0 && showCreateButton && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer transition-colors shadow-sm hover:shadow-md border-dashed border-2 border-muted-foreground/25 hover:border-primary/50">
                <CardContent className="flex flex-col items-center justify-center h-48 p-6">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="text-lg text-center mb-2">
                    {createButtonText || t('business.management.createBusiness')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground text-center">
                    {t('business.management.createBusinessDescription')}
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{t('business.management.createBusinessTitle')}</DialogTitle>
                <DialogDescription>
                  {t('business.management.createBusinessDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business-name">{t('business.management.businessName')}</Label>
                  <Input
                    id="business-name"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    placeholder={t('business.management.enterBusinessName')}
                  />
                </div>
                
                {/* Payment Information */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('business.management.subscriptionRequired')}</span>
                    <Badge variant="secondary">{subscriptionPrice}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('business.management.subscriptionDescription')}
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t('business.management.includes')}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {[
                        t('business.management.teamCollaboration'),
                        t('business.management.sharedAnalytics'), 
                        t('business.management.managerAccessControls'),
                        t('business.management.businessReporting')
                      ].map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t('business.management.cancel')}
                </Button>
                <Button onClick={handleCreateBusiness} disabled={isSubmitting}>
                  {isSubmitting ? t('business.management.saving') : t('business.management.startSubscription')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty State */}
      {filteredBusinesses.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {emptyStateMessage || t('business.dashboard.noBusiness.title')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('business.management.getStarted')}
          </p>
          {showCreateButton && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {createButtonText || t('business.management.createFirstBusiness')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>{t('business.management.createBusinessTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('business.management.createBusinessDialogDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="business-name">{t('business.management.businessName')}</Label>
                    <Input
                      id="business-name"
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      placeholder={t('business.management.enterBusinessName')}
                    />
                  </div>
                  
                  {/* Payment Information */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t('business.management.subscriptionRequired')}</span>
                      <Badge variant="secondary">{subscriptionPrice}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('business.management.subscriptionDescription')}
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t('business.management.includes')}</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {[
                          t('business.management.teamCollaboration'),
                          t('business.management.sharedAnalytics'), 
                          t('business.management.managerAccessControls'),
                          t('business.management.businessReporting')
                        ].map((feature: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    {t('business.management.cancel')}
                  </Button>
                  <Button onClick={handleCreateBusiness} disabled={isSubmitting}>
                    {isSubmitting ? t('business.management.saving') : t('business.management.startSubscription')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Manage Business Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={(open) => {
        setManageDialogOpen(open)
        // Refresh data when dialog is closed to get updated manager IDs
        if (!open) {
          loadBusinessData()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('business.management.manageTitle').replace('{name}', selectedBusiness?.name || '')}</DialogTitle>
            <DialogDescription>
              {t('business.management.manageDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2 px-1">
            {/* Rename Business Section */}
            <div>
              <h4 className="font-medium mb-3">{t('business.rename.title')}</h4>
              <div className="flex gap-2">
                <Input
                  placeholder={t('business.rename.placeholder')}
                  value={renameBusinessName}
                  onChange={(e) => setRenameBusinessName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleRenameBusiness} 
                  disabled={isSubmitting || !renameBusinessName.trim()}
                  size="sm"
                >
                  {isSubmitting ? t('business.management.saving') : t('business.management.rename')}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Traders Section */}
            <div>
              <h4 className="font-medium mb-3">{t('business.traders')}</h4>
              
              {/* Current Traders */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('business.traders.current')}</h5>
                <div className="space-y-2">
                  {(selectedBusiness?.traders.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('business.traders.noTraders')}</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedBusiness?.traders.map((trader: { id: string; email: string }) => (
                        <div key={trader.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                          <span>{trader.email}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t('business.management.member')}</Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] sm:w-full">
                                                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('business.management.removeTrader')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('business.management.removeTraderConfirm').replace('{email}', trader.email)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveTrader(trader.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('business.management.removeTraderAction')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Trader */}
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('business.traders.addNew')}</h5>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('business.traders.add.description')}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('business.traders.add.placeholder')}
                    value={newTraderEmail}
                    onChange={(e) => setNewTraderEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddTrader} 
                    disabled={isSubmitting || !newTraderEmail.trim()}
                    size="sm"
                  >
                    {isSubmitting ? t('business.management.saving') : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Pending Invitations */}
              <div className="mt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('business.invitations.pending')}</h5>
                {pendingInvitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('business.management.noPendingInvitations')}</p>
                ) : (
                  <div className="space-y-1">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                        <span>{invitation.email}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{t('business.management.pending')}</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] sm:w-full">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('business.management.cancelInvitation')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('business.management.cancelInvitationConfirm').replace('{email}', invitation.email)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                                  <AlertDialogAction
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('business.management.cancelInvitationAction')}
                                  </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Managers Section */}
            <div>
              <h4 className="font-medium mb-3">{t('business.managers')}</h4>
              
              {/* Current Managers */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('business.managers.current')}</h5>
                <div className="space-y-2">
                  {(selectedBusiness?.managers.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('business.managers.noManagers')}</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedBusiness?.managers.map((manager) => (
                        <div key={manager.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                          <span>{manager.email}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {manager.access === 'admin' ? t('dashboard.business.admin') : t('dashboard.business.viewer')}
                            </Badge>
                            <Select 
                              value={manager.access} 
                              onValueChange={(value: 'admin' | 'viewer') => handleUpdateManagerAccess(manager.managerId, value)}
                            >
                              <SelectTrigger className="w-20 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">{t('dashboard.business.viewer')}</SelectItem>
                                <SelectItem value="admin">{t('dashboard.business.admin')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] sm:w-full">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('business.management.removeManager')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('business.management.removeManagerConfirm').replace('{email}', manager.email)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveManager(manager.managerId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('business.management.removeManagerAction')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Manager */}
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('business.managers.addNew')}</h5>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('dashboard.business.managerEmail')}
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newManagerAccess} onValueChange={(value: 'admin' | 'viewer') => setNewManagerAccess(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">{t('dashboard.business.viewer')}</SelectItem>
                      <SelectItem value="admin">{t('dashboard.business.admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddManager} disabled={isSubmitting}>
                    {isSubmitting ? t('business.management.saving') : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              {t('business.management.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 