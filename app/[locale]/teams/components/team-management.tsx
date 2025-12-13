'use client'

import { useState, useEffect, useCallback } from 'react'
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
  joinTeam,
  leaveTeam,
  getUserTeams,
  addManagerToTeam,
  removeManagerFromTeam,
  updateManagerAccess,
  getUserTeamAccess,
  deleteTeam,
  renameTeam,
  sendTeamInvitation,
  getTeamInvitations,
  removeTraderFromTeam,
  cancelTeamInvitation,
  createTeam
} from '@/app/[locale]/dashboard/settings/actions'
import { redirect, usePathname } from 'next/navigation'
import Link from 'next/link'

interface Team {
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

interface ManagedTeam extends Team {
  userAccess: string
}

interface TeamManagementProps {
  // Event handlers
  onTeamClick?: (team: Team) => void
  onManageClick?: (team: Team) => void
  onViewClick?: (team: Team) => void
}

export function TeamManagement({
  onTeamClick,
  onManageClick,
  onViewClick,
}: TeamManagementProps) {

  const pathname = usePathname()
  const [firstTeamId, setFirstTeamId] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      // If we are not yet on a team dashboard, we try to redirect to the first team
      if (!pathname.endsWith('/teams/dashboard')) {
        return;
      }
      // Get user's teams
      const teamsResult = await getUserTeams()
      const managedResult = await getUserTeamAccess()

      if (teamsResult.success) {
        // Check owned teams first
        if (teamsResult.ownedTeams && teamsResult.ownedTeams.length > 0) {
          setFirstTeamId(teamsResult.ownedTeams[0].id)
          return
        }
        // If no owned teams, check joined teams
        else if (teamsResult.joinedTeams && teamsResult.joinedTeams.length > 0) {
          setFirstTeamId(teamsResult.joinedTeams[0].id)
          return
        }
      }

      // If still no team found, check managed teams
      if (!firstTeamId && managedResult.success && managedResult.managedTeams && managedResult.managedTeams.length > 0) {
        setFirstTeamId(managedResult.managedTeams[0].id)
      }

    }
    loadInitialData()
    // If we found a team, redirect to it
    if (firstTeamId) {
      redirect(`/teams/dashboard/${firstTeamId}`)
    }
  }, [firstTeamId, pathname])
  const t = useI18n()

  // State
  const [userTeams, setUserTeams] = useState<{
    ownedTeams: Team[]
    joinedTeams: Team[]
  }>({ ownedTeams: [], joinedTeams: [] })

  const [managedTeams, setManagedTeams] = useState<ManagedTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  // Form states
  const [newTeamName, setNewTeamName] = useState('')
  const [joinTeamId, setJoinTeamId] = useState('')
  const [newManagerEmail, setNewManagerEmail] = useState('')
  const [newManagerAccess, setNewManagerAccess] = useState<'admin' | 'viewer'>('viewer')
  const [renameTeamName, setRenameTeamName] = useState('')
  const [newTraderEmail, setNewTraderEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])

  // Load data on component mount
  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    setIsLoading(true)
    try {
      // Load owned and joined teams
      const teamsResult = await getUserTeams()
      if (teamsResult.success) {
        setUserTeams({
          ownedTeams: teamsResult.ownedTeams || [],
          joinedTeams: teamsResult.joinedTeams || [],
        })
      }

      // Load managed teams
      const managedResult = await getUserTeamAccess()
      if (managedResult.success) {
        setManagedTeams(managedResult.managedTeams || [])
      }
    } catch (error) {
      console.error('Error loading team data:', error)
      toast.error(t('dashboard.teams.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error(t('teams.rename.nameRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createTeam(newTeamName.trim())
      if (result.success) {
        toast.success(t('teams.management.createTeamTitle') + ' - ' + t('teams.rename.success'))
        setCreateDialogOpen(false)
        setNewTeamName('')
        await loadTeamData()
      } else {
        toast.error(result.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error(t('dashboard.teams.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!joinTeamId.trim()) {
      toast.error('Team ID is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await joinTeam(joinTeamId.trim())
      if (result.success) {
        toast.success('Joined team successfully')
        setJoinDialogOpen(false)
        setJoinTeamId('')
        await loadTeamData()
      } else {
        toast.error(result.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error joining team:', error)
      toast.error(t('dashboard.teams.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLeaveTeam = async (teamId: string) => {
    try {
      const result = await leaveTeam(teamId)
      if (result.success) {
        toast.success(t('dashboard.teams.leaveSuccess'))
        await loadTeamData()
      } else {
        toast.error(result.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error leaving team:', error)
      toast.error(t('dashboard.teams.error'))
    }
  }

  const handleAddManager = async () => {
    if (!newManagerEmail.trim()) {
      toast.error(t('dashboard.teams.managerEmail'))
      return
    }

    if (!selectedTeam) return

    setIsSubmitting(true)
    try {
      const result = await addManagerToTeam(selectedTeam.id, newManagerEmail.trim(), newManagerAccess)
      if (result.success) {
        toast.success(t('dashboard.teams.managerAdded'))

        // Update the selected team locally
        const newManager = {
          id: `temp-${Date.now()}`, // Temporary ID
          managerId: 'temp-manager-id', // This will be updated when we reload the data
          access: newManagerAccess,
          email: newManagerEmail.trim(),
        }

        const updatedSelectedTeam = {
          ...selectedTeam,
          managers: [...selectedTeam.managers, newManager]
        }
        setSelectedTeam(updatedSelectedTeam)

        // Update the teams in the main state to keep everything in sync
        setUserTeams(prev => ({
          ownedTeams: prev.ownedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          ),
          joinedTeams: prev.joinedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          )
        }))

        setManagedTeams(prev =>
          prev.map(team =>
            team.id === selectedTeam.id
              ? { ...updatedSelectedTeam, userAccess: team.userAccess }
              : team
          )
        )

        setNewManagerEmail('')
        setNewManagerAccess('viewer')

        // Note: We don't reload data immediately to keep the dialog open
        // Data will be refreshed when the dialog is closed or when needed
      } else {
        toast.error(result.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error adding manager:', error)
      toast.error(t('dashboard.teams.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveManager = async (managerId: string) => {
    if (!selectedTeam) return

    try {
      const result = await removeManagerFromTeam(selectedTeam.id, managerId)
      if (result.success) {
        toast.success(t('dashboard.teams.managerRemoved'))

        // Update the selected team locally
        const updatedSelectedTeam = {
          ...selectedTeam,
          managers: selectedTeam.managers.filter(manager => manager.managerId !== managerId)
        }
        setSelectedTeam(updatedSelectedTeam)

        // Update the teams in the main state to keep everything in sync
        setUserTeams(prev => ({
          ownedTeams: prev.ownedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          ),
          joinedTeams: prev.joinedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          )
        }))

        setManagedTeams(prev =>
          prev.map(team =>
            team.id === selectedTeam.id
              ? { ...updatedSelectedTeam, userAccess: team.userAccess }
              : team
          )
        )

        // Note: We don't reload data immediately to keep the dialog open
        // Data will be refreshed when the dialog is closed
      } else {
        toast.error(result.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error removing manager:', error)
      toast.error(t('dashboard.teams.error'))
    }
  }

  const handleUpdateManagerAccess = async (managerId: string, access: 'admin' | 'viewer') => {
    if (!selectedTeam) return

    try {
      const result = await updateManagerAccess(selectedTeam.id, managerId, access)
      if (result.success) {
        toast.success(t('dashboard.teams.accessUpdated'))

        // Update the selected team locally
        const updatedSelectedTeam = {
          ...selectedTeam,
          managers: selectedTeam.managers.map(manager =>
            manager.managerId === managerId
              ? { ...manager, access }
              : manager
          )
        }
        setSelectedTeam(updatedSelectedTeam)

        // Update the teams in the main state to keep everything in sync
        setUserTeams(prev => ({
          ownedTeams: prev.ownedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          ),
          joinedTeams: prev.joinedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          )
        }))

        setManagedTeams(prev =>
          prev.map(team =>
            team.id === selectedTeam.id
              ? { ...updatedSelectedTeam, userAccess: team.userAccess }
              : team
          )
        )

        // Note: We don't reload data immediately to keep the dialog open
        // Data will be refreshed when the dialog is closed or when needed
      } else {
        toast.error(result.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error updating manager access:', error)
      toast.error(t('dashboard.teams.error'))
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const result = await deleteTeam(teamId)
      if (result.success) {
        toast.success('Team deleted successfully')
        await loadTeamData()
      } else {
        toast.error(result.error || 'Failed to delete team')
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Failed to delete team')
    }
  }

  const handleRenameTeam = async () => {
    if (!selectedTeam || !renameTeamName.trim()) {
      toast.error(t('teams.rename.nameRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await renameTeam(selectedTeam.id, renameTeamName.trim())
      if (result.success) {
        toast.success(t('teams.rename.success'))

        // Update the selected team name locally
        const updatedSelectedTeam = {
          ...selectedTeam,
          name: renameTeamName.trim()
        }
        setSelectedTeam(updatedSelectedTeam)

        // Update the teams in the main state to keep everything in sync
        setUserTeams(prev => ({
          ownedTeams: prev.ownedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          ),
          joinedTeams: prev.joinedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          )
        }))

        setManagedTeams(prev =>
          prev.map(team =>
            team.id === selectedTeam.id
              ? { ...updatedSelectedTeam, userAccess: team.userAccess }
              : team
          )
        )

        // Keep the modal open and reset the rename input
        setRenameTeamName('')
      } else {
        toast.error(result.error || t('teams.rename.error'))
      }
    } catch (error) {
      console.error('Error renaming team:', error)
      toast.error(t('teams.rename.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTrader = async () => {
    if (!selectedTeam || !newTraderEmail.trim()) {
      toast.error(t('teams.traders.add.emailRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await sendTeamInvitation(selectedTeam.id, newTraderEmail.trim())
      if (result.success) {
        toast.success(t('teams.invitations.sent'))
        setNewTraderEmail('')
        // Only reload pending invitations, no need to reload all team data
        await loadPendingInvitations()
      } else {
        toast.error(result.error || t('teams.traders.add.error'))
      }
    } catch (error) {
      console.error('Error adding trader:', error)
      toast.error(t('teams.traders.add.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadPendingInvitations = async () => {
    if (!selectedTeam) return

    try {
      const result = await getTeamInvitations(selectedTeam.id)
      if (result.success) {
        setPendingInvitations(result.invitations || [])
      }
    } catch (error) {
      console.error('Error loading pending invitations:', error)
    }
  }

  const handleRemoveTrader = async (traderId: string) => {
    if (!selectedTeam) return

    try {
      const removeResult = await removeTraderFromTeam(selectedTeam.id, traderId)
      if (removeResult.success) {
        toast.success('Trader removed successfully')

        // Update the selected team locally
        const updatedSelectedTeam = {
          ...selectedTeam,
          traderIds: selectedTeam.traderIds.filter(id => id !== traderId),
          traders: selectedTeam.traders.filter(trader => trader.id !== traderId)
        }
        setSelectedTeam(updatedSelectedTeam)

        // Update the teams in the main state to keep everything in sync
        setUserTeams(prev => ({
          ownedTeams: prev.ownedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          ),
          joinedTeams: prev.joinedTeams.map(team =>
            team.id === selectedTeam.id
              ? updatedSelectedTeam
              : team
          )
        }))

        setManagedTeams(prev =>
          prev.map(team =>
            team.id === selectedTeam.id
              ? { ...updatedSelectedTeam, userAccess: team.userAccess }
              : team
          )
        )
      } else {
        toast.error(removeResult.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error removing trader:', error)
      toast.error(t('dashboard.teams.error'))
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedTeam) return

    try {
      const cancelResult = await cancelTeamInvitation(selectedTeam.id, invitationId)
      if (cancelResult.success) {
        toast.success('Invitation canceled successfully')
        await loadPendingInvitations()
      } else {
        toast.error(cancelResult.error || t('dashboard.teams.error'))
      }
    } catch (error) {
      console.error('Error canceling invitation:', error)
      toast.error(t('dashboard.teams.error'))
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
      return t('dashboard.teams.owner')
    }
    switch (access) {
      case 'admin':
        return t('dashboard.teams.admin')
      case 'viewer':
        return t('dashboard.teams.viewer')
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

  // Deduplicate teams to prevent showing the same team twice
  const allTeams = new Map<string, Team>()

  // Add owned teams first (highest priority)
  userTeams.ownedTeams.forEach(team => {
    allTeams.set(team.id, { ...team, userAccess: 'admin' })
  })

  // Add joined teams (medium priority)
  userTeams.joinedTeams.forEach(team => {
    if (!allTeams.has(team.id)) {
      allTeams.set(team.id, { ...team, userAccess: 'viewer' })
    }
  })

  // Add managed teams (lowest priority - only if not already added)
  managedTeams.forEach(team => {
    if (!allTeams.has(team.id)) {
      allTeams.set(team.id, team)
    }
  })

  const filteredTeams = Array.from(allTeams.values())

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
    <div className="mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('teams.management.component.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('teams.management.component.description')}</p>
      </div>


      {/* Teams Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => {
          const isOwner = userTeams.ownedTeams.some(b => b.id === team.id)
          const isJoined = userTeams.joinedTeams.some(b => b.id === team.id)
          const isManaged = managedTeams.some(b => b.id === team.id)
          const access = team.userAccess || (isOwner ? 'admin' : 'viewer')
          const isActive = pathname.includes(`/teams/dashboard/${team.id}`)

          return (
            <Card key={team.id} className={cn(
              "cursor-pointer transition-colors shadow-xs hover:shadow-md",
              isActive 
                ? "border-primary ring-2 ring-primary/20" 
                : "hover:border-primary/50"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "rounded-full h-2 w-2 shrink-0",
                      getStatusIndicator(access, isOwner)
                    )} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className={cn(
                        "text-sm truncate flex items-center gap-2",
                        isActive && "text-primary"
                      )}>
                        {team.name}
                        {isActive && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                            {t('teams.management.active')}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getAccessLabel(access, isOwner)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-muted-foreground">{t('dashboard.teams.traders')}</span>
                  <span className="font-medium">{team.traderIds.length}</span>
                </div>

                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-muted-foreground">{t('teams.management.created')}</span>
                  <span className="text-xs">{formatDate(team.createdAt)}</span>
                </div>

                <Separator />

                <div className="flex gap-2 flex-wrap">
                  {/* Manage button - only for owners and admins */}
                  {(isOwner || access === 'admin') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={async () => {
                        setSelectedTeam(team)
                        setRenameTeamName(team.name)
                        setManageDialogOpen(true)
                        // Load pending invitations when dialog opens
                        setTimeout(async () => {
                          await loadPendingInvitations()
                        }, 100)
                      }}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      {t('teams.management.manage')}
                    </Button>
                  )}

                  {/* View button - for all team members (owners, admins, regular members, managed teams) */}
                  {(isOwner || isJoined || isManaged) && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <Link href={`/teams/dashboard/${team.id}`} className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {t('teams.dashboard.view')}
                      </Link>
                    </Button>
                  )}

                  {/* Delete button - only for owners */}
                  {isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1 text-xs">
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('teams.management.delete')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('teams.management.deleteTeam')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('teams.management.deleteConfirm').replace('{name}', team.name)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeam(team.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('teams.management.deleteTeam')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Leave button - for joined/managed teams that are not owners */}
                  {(isJoined || isManaged) && !isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          <UserMinus className="h-3 w-3 mr-1" />
                          {t('teams.management.leave')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:w-full">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('teams.management.leave')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('teams.management.leaveConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleLeaveTeam(team.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('teams.management.leave')}
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

        {/* Create New Team Card - only show if there's at least one team */}
        {filteredTeams.length > 0 && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer transition-colors shadow-xs hover:shadow-md border-dashed border-2 border-muted-foreground/25 hover:border-primary/50">
                <CardContent className="flex flex-col items-center justify-center h-48 p-6">
                  <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="text-lg text-center mb-2">
                    {t('teams.management.component.createButtonText')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground text-center">
                    {t('teams.management.createTeamDescription')}
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{t('teams.management.createTeamTitle')}</DialogTitle>
                <DialogDescription>
                  {t('teams.management.createTeamDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team-name">{t('teams.management.teamName')}</Label>
                  <Input
                    id="team-name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder={t('teams.management.enterTeamName')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t('teams.management.cancel')}
                </Button>
                <Button onClick={handleCreateTeam} disabled={isSubmitting}>
                  {isSubmitting ? t('teams.management.saving') : t('teams.management.createTeamTitle')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty State */}
      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('teams.management.component.emptyStateMessage')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('teams.management.getStarted')}
          </p>
          {(
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('teams.management.component.createButtonText')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>{t('teams.management.createTeamTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('teams.management.createTeamDialogDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="team-name">{t('teams.management.teamName')}</Label>
                    <Input
                      id="team-name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder={t('teams.management.enterTeamName')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    {t('teams.management.cancel')}
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={isSubmitting}>
                    {isSubmitting ? t('teams.management.saving') : t('teams.management.startSubscription')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Manage Team Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={(open) => {
        setManageDialogOpen(open)
        // Refresh data when dialog is closed to get updated manager IDs
        if (!open) {
          loadTeamData()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('teams.management.manageTitle').replace('{name}', selectedTeam?.name || '')}</DialogTitle>
            <DialogDescription>
              {t('teams.management.manageDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2 px-1">
            {/* Rename Team Section */}
            <div>
              <h4 className="font-medium mb-3">{t('teams.rename.title')}</h4>
              <div className="flex gap-2">
                <Input
                  placeholder={t('teams.rename.placeholder')}
                  value={renameTeamName}
                  onChange={(e) => setRenameTeamName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleRenameTeam}
                  disabled={isSubmitting || !renameTeamName.trim()}
                  size="sm"
                >
                  {isSubmitting ? t('teams.management.saving') : t('teams.management.rename')}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Traders Section */}
            <div>
              <h4 className="font-medium mb-3">{t('teams.traders')}</h4>

              {/* Current Traders */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.traders.current')}</h5>
                <div className="space-y-2">
                  {(selectedTeam?.traders.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('teams.traders.noTraders')}</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedTeam?.traders.map((trader: { id: string; email: string }) => (
                        <div key={trader.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                          <span>{trader.email}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t('teams.management.member')}</Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] sm:w-full">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('teams.management.removeTrader')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('teams.management.removeTraderConfirm').replace('{email}', trader.email)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveTrader(trader.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('teams.management.removeTraderAction')}
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
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.traders.addNew')}</h5>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('teams.traders.add.description')}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('teams.traders.add.placeholder')}
                    value={newTraderEmail}
                    onChange={(e) => setNewTraderEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddTrader}
                    disabled={isSubmitting || !newTraderEmail.trim()}
                    size="sm"
                  >
                    {isSubmitting ? t('teams.management.saving') : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Pending Invitations */}
              <div className="mt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.invitations.pending')}</h5>
                {pendingInvitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('teams.management.noPendingInvitations')}</p>
                ) : (
                  <div className="space-y-1">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                        <span>{invitation.email}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{t('teams.management.pending')}</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground">
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] sm:w-full">
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('teams.management.cancelInvitation')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('teams.management.cancelInvitationConfirm').replace('{email}', invitation.email)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('teams.management.cancelInvitationAction')}
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
              <h4 className="font-medium mb-3">{t('teams.managers')}</h4>

              {/* Current Managers */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.managers.current')}</h5>
                <div className="space-y-2">
                  {(selectedTeam?.managers.length || 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('teams.managers.noManagers')}</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedTeam?.managers.map((manager) => (
                        <div key={manager.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                          <span>{manager.email}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {manager.access === 'admin' ? t('dashboard.teams.admin') : t('dashboard.teams.viewer')}
                            </Badge>
                            <Select
                              value={manager.access}
                              onValueChange={(value: 'admin' | 'viewer') => handleUpdateManagerAccess(manager.managerId, value)}
                            >
                              <SelectTrigger className="w-20 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">{t('dashboard.teams.viewer')}</SelectItem>
                                <SelectItem value="admin">{t('dashboard.teams.admin')}</SelectItem>
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
                                  <AlertDialogTitle>{t('teams.management.removeManager')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('teams.management.removeManagerConfirm').replace('{email}', manager.email)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveManager(manager.managerId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('teams.management.removeManagerAction')}
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
                <h5 className="text-sm font-medium text-muted-foreground mb-2">{t('teams.managers.addNew')}</h5>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('dashboard.teams.managerEmail')}
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newManagerAccess} onValueChange={(value: 'admin' | 'viewer') => setNewManagerAccess(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">{t('dashboard.teams.viewer')}</SelectItem>
                      <SelectItem value="admin">{t('dashboard.teams.admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddManager} disabled={isSubmitting}>
                    {isSubmitting ? t('teams.management.saving') : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              {t('teams.management.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 