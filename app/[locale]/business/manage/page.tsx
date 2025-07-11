'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Building2, 
  Users, 
  Plus, 
  Search, 
  UserPlus, 
  UserMinus, 
  Shield,
  Crown,
  Eye,
  Settings,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
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
import { joinBusiness, leaveBusiness, getUserBusinesses, addManagerToBusiness, removeManagerFromBusiness, updateManagerAccess, getUserBusinessAccess, deleteBusiness, renameBusiness, sendBusinessInvitation, getBusinessInvitations, removeTraderFromBusiness, cancelBusinessInvitation } from '../../dashboard/settings/actions'

interface Business {
  id: string
  name: string
  userId: string
  traderIds: string[]
  traders: { id: string; email: string }[]
  createdAt: any
  updatedAt: any
  userAccess?: string
}

interface ManagedBusiness extends Business {
  userAccess: string
}

export default function BusinessManagePage() {
  const t = useI18n()
  
  // State
  const [userBusinesses, setUserBusinesses] = useState<{
    ownedBusinesses: Business[]
    joinedBusinesses: Business[]
  }>({ ownedBusinesses: [], joinedBusinesses: [] })
  
  const [managedBusinesses, setManagedBusinesses] = useState<ManagedBusiness[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
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
      // This follows the same pattern as the pricing plans component
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
        setManageDialogOpen(false)
        setNewManagerEmail('')
        setNewManagerAccess('viewer')
        await loadBusinessData()
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
        await loadBusinessData()
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
        await loadBusinessData()
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
      const result = await removeTraderFromBusiness(selectedBusiness.id, traderId)
      if (result.success) {
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
        toast.error(result.error || t('dashboard.business.error'))
      }
    } catch (error) {
      console.error('Error removing trader:', error)
      toast.error(t('dashboard.business.error'))
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedBusiness) return

    try {
      const result = await cancelBusinessInvitation(selectedBusiness.id, invitationId)
      if (result.success) {
        toast.success('Invitation canceled successfully')
        await loadPendingInvitations()
      } else {
        toast.error(result.error || t('dashboard.business.error'))
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

  const filteredBusinesses = Array.from(allBusinesses.values()).filter(business =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('business.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('business.description')}</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search businesses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Business
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Create Business</DialogTitle>
                <DialogDescription>
                  Create a new business to manage your trading team. Each business requires a subscription.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    placeholder="Enter business name"
                  />
                </div>
                
                {/* Payment Information */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Subscription Required</span>
                    <Badge variant="secondary">$500/month per business</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each business requires a subscription to access team features and analytics.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Includes:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {[
                        'Team collaboration',
                        'Shared analytics', 
                        'Manager access controls',
                        'Business reporting'
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
                  Cancel
                </Button>
                <Button onClick={handleCreateBusiness} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Start Subscription'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Join Business
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Join Business</DialogTitle>
                <DialogDescription>
                  Join an existing business using its ID
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business-id">Business ID</Label>
                  <Input
                    id="business-id"
                    value={joinBusinessId}
                    onChange={(e) => setJoinBusinessId(e.target.value)}
                    placeholder="Enter business ID"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleJoinBusiness} disabled={isSubmitting}>
                  {isSubmitting ? t('common.saving') : 'Join Business'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                  <span className="text-muted-foreground">Created</span>
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
                        Manage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          window.location.href = `/business/dashboard/${business.id}`
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
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Business</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{business.name}&quot;? This action cannot be undone and will permanently delete the business and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBusiness(business.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Business
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
                          {t('dashboard.business.leave')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('dashboard.business.leave')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('dashboard.business.leaveConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLeaveBusiness(business.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('dashboard.business.leave')}
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
      </div>

      {/* Empty State */}
      {filteredBusinesses.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('dashboard.business.noBusiness')}</h3>
          <p className="text-muted-foreground mb-4">Get started by creating your first business or joining an existing one</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Business
          </Button>
        </div>
      )}

      {/* Manage Business Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Manage - {selectedBusiness?.name}</DialogTitle>
            <DialogDescription>
              Manage your business settings, rename, traders, and managers
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
                  {isSubmitting ? t('common.saving') : 'Rename'}
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
                            <Badge variant="outline">Member</Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] sm:w-full">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Trader</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove &quot;{trader.email}&quot; from this business? They will lose access to the business data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveTrader(trader.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove Trader
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
                    {isSubmitting ? t('common.saving') : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Pending Invitations */}
              <div className="mt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('business.invitations.pending')}</h5>
                {pendingInvitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending invitations.</p>
                ) : (
                  <div className="space-y-1">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                        <span>{invitation.email}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Pending</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] sm:w-full">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel the invitation for &quot;{invitation.email}&quot;? They will no longer be able to join this business using this invitation.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel Invitation
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
                  <div className="text-sm text-muted-foreground">
                    {t('business.managers.noManagers')}
                  </div>
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
                    {isSubmitting ? t('common.saving') : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
