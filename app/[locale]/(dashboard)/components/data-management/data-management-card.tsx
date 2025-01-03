'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { TrashIcon, AlertCircle, ChevronDown, ChevronUp, MoreVertical, Edit2, Loader2 } from "lucide-react"
import { 
  deleteAccounts, 
  deleteInstrumentGroup, 
  updateCommissionForGroup, 
  renameAccount,
  renameInstrument 
} from "../../dashboard/data/actions"
import debounce from 'lodash/debounce'
import { useUser } from '@/components/context/user-data'
import { useTrades } from '@/components/context/trades-data'
import { toast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Trade } from '@prisma/client'
import ExportButton from '@/components/export-button'

type GroupedTrades = Record<string, Record<string, Trade[]>>


export function DataManagementCard() {
  const { trades, setTrades, refreshTrades } = useTrades()
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [renameLoading, setRenameLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameInstrumentDialogOpen, setRenameInstrumentDialogOpen] = useState(false)
  const [accountToRename, setAccountToRename] = useState("")
  const [instrumentToRename, setInstrumentToRename] = useState({ accountNumber: "", currentName: "" })
  const [newAccountName, setNewAccountName] = useState("")
  const [newInstrumentName, setNewInstrumentName] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all'>('selected')
  const [groupedTrades, setGroupedTrades] = useState<GroupedTrades>({})



  const getGroupedTrades = useMemo(() => {
    return trades.reduce<GroupedTrades>((acc, trade) => {
      if (!acc[trade.accountNumber]) {
        acc[trade.accountNumber] = {}
      }
      if (!acc[trade.accountNumber][trade.instrument]) {
        acc[trade.accountNumber][trade.instrument] = []
      }
      acc[trade.accountNumber][trade.instrument].push(trade)
      return acc
    }, {})
  }, [trades])

  useEffect(() => {
    if (!user) return
    const fetchTradesData = async () => {
      try {
        setLoading(true)
        setGroupedTrades(getGroupedTrades)
      } catch (error) {
        console.error("Failed to fetch trades:", error)
        setError(error instanceof Error ? error : new Error('Failed to fetch trades'))
      } finally {
        setLoading(false)
      }
    }
    fetchTradesData()
  }, [user, trades, getGroupedTrades])

  const handleDeleteAccounts = async () => {
    if (!user) return
    try {
      setDeleteLoading(true)
      const accountsToDelete = deleteMode === 'all' ? Object.keys(groupedTrades) : selectedAccounts
      await deleteAccounts(accountsToDelete, user.id)
      await refreshTrades()
      setGroupedTrades(getGroupedTrades)
      setSelectedAccounts([])
      toast({
        title: `Account${accountsToDelete.length > 1 ? 's' : ''} deleted successfully`,
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete accounts:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete accounts'))
      toast({
        title: 'Failed to delete accounts',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleDeleteInstrument = async (accountNumber: string, instrumentGroup: string) => {
    try {
      setLoading(true)
      await deleteInstrumentGroup(accountNumber, instrumentGroup, user!.id)
      await refreshTrades()
      setGroupedTrades(getGroupedTrades)
      toast({
        title: 'Instrument group deleted successfully',
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete instrument group:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete instrument group'))
      toast({
        title: 'Failed to delete instrument group',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const debouncedUpdateCommission = useMemo(
    () => debounce(async (accountNumber: string, instrumentGroup: string, newCommission: number, userId: string) => {
      try {
        await updateCommissionForGroup(accountNumber, instrumentGroup, newCommission)
        await refreshTrades()
        setGroupedTrades(getGroupedTrades)
        toast({
          title: 'Commission updated successfully',
          variant: 'default',
        })
      } catch (error) {
        console.error("Failed to update commission:", error)
        setError(error instanceof Error ? error : new Error('Failed to update commission'))
        toast({
          title: 'Failed to update commission',
          description: 'Please try again later',
          variant: 'destructive',
        })
      }
    }, 1000),
    [refreshTrades, getGroupedTrades]
  )

  const handleUpdateCommission = useCallback((accountNumber: string, instrumentGroup: string, newCommission: number, user: User | null) => {
    if (!user) return
    debouncedUpdateCommission(accountNumber, instrumentGroup, newCommission, user.id)
  }, [debouncedUpdateCommission])

  const toggleAccountExpansion = (accountNumber: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountNumber]: !prev[accountNumber]
    }))
  }

  const handleRenameAccount = async () => {
    if (!user || !accountToRename || !newAccountName) return
    try {
      setRenameLoading(true)
      await renameAccount(accountToRename, newAccountName, user.id)
      await refreshTrades()
      toast({
        title: 'Account renamed successfully',
        variant: 'default',
      })
      setRenameDialogOpen(false)
      setAccountToRename("")
      setNewAccountName("")
    } catch (error) {
      console.error("Failed to rename account:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename account'))
      toast({
        title: 'Failed to rename account',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setRenameLoading(false)
    }
  }

  const handleSelectAccount = (accountNumber: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountNumber)
        ? prev.filter(acc => acc !== accountNumber)
        : [...prev, accountNumber]
    )
  }

  const handleRenameInstrument = async () => {
    if (!user || !instrumentToRename.currentName || !newInstrumentName) return
    try {
      setRenameLoading(true)
      await renameInstrument(instrumentToRename.accountNumber, instrumentToRename.currentName, newInstrumentName, user.id)
      await refreshTrades()
      toast({
        title: 'Instrument renamed successfully',
        variant: 'default',
      })
      setRenameInstrumentDialogOpen(false)
      setInstrumentToRename({ accountNumber: "", currentName: "" })
      setNewInstrumentName("")
    } catch (error) {
      console.error("Failed to rename instrument:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename instrument'))
      toast({
        title: 'Failed to rename instrument',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setRenameLoading(false)
    }
  }

  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col md:flex-row gap-y-4 md:gap-y-0 justify-between items-start md:items-center">
          <span className="text-xl md:text-2xl">Data Management Dashboard</span>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <ExportButton trades={trades} />
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 md:flex-none"
                  disabled={selectedAccounts.length === 0 || deleteLoading}
                  onClick={() => {
                    setDeleteMode('selected')
                    setDeleteDialogOpen(true)
                  }}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>Delete Selected ({selectedAccounts.length})</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected account(s)
                    and all associated instruments and trades.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccounts} disabled={deleteLoading}>
                    {deleteLoading ? 'Deleting...' : 'Continue'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeleteMode('all')
                    setDeleteDialogOpen(true)
                  }}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>Delete All</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete ALL accounts
                    and all associated instruments and trades.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccounts} disabled={deleteLoading}>
                    {deleteLoading ? 'Deleting...' : 'Continue'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardTitle>
        <CardDescription>Manage accounts, instruments, and commissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedTrades).map(([accountNumber, instruments]) => (
            <div key={accountNumber} className="border-b pb-4 last:border-b-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
                <div className="flex items-center w-full sm:w-auto">
                  <Checkbox
                    id={`select-${accountNumber}`}
                    checked={selectedAccounts.includes(accountNumber)}
                    onCheckedChange={() => handleSelectAccount(accountNumber)}
                    className="mr-2 flex-shrink-0"
                  />
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <button
                      onClick={() => toggleAccountExpansion(accountNumber)}
                      className="flex items-center text-base sm:text-lg font-semibold focus:outline-none text-left"
                      aria-expanded={expandedAccounts[accountNumber]}
                      aria-controls={`account-${accountNumber}`}
                    >
                      <span className="mr-2">{accountNumber}</span>
                      {expandedAccounts[accountNumber] ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                    </button>
                    <div className="flex items-center sm:hidden ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => {
                            setAccountToRename(accountNumber)
                            setRenameDialogOpen(true)
                          }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename Account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => {
                              setSelectedAccounts([accountNumber])
                              setDeleteMode('selected')
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    onClick={() => {
                      setAccountToRename(accountNumber)
                      setRenameDialogOpen(true)
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setSelectedAccounts([accountNumber])
                      setDeleteMode('selected')
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
              {expandedAccounts[accountNumber] && (
                <div id={`account-${accountNumber}`} className="space-y-4 pl-2 sm:pl-4">
                  {Object.entries(instruments).map(([instrumentGroup, trades]) => (
                    <div key={instrumentGroup} className="bg-gray-100 dark:bg-white/5 p-3 sm:p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-md font-medium">
                            {instrumentGroup}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setInstrumentToRename({ accountNumber, currentName: instrumentGroup })
                              setRenameInstrumentDialogOpen(true)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Rename instrument</span>
                          </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <div className="relative w-full sm:w-32">
                            <Input
                              type="number"
                              placeholder="Commission"
                              defaultValue={trades[0].commission / trades[0].quantity}
                              className="w-full"
                              onChange={(e) => handleUpdateCommission(accountNumber, instrumentGroup, parseFloat(e.target.value), user)}
                              aria-label={`Update commission for ${instrumentGroup}`}
                            />
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto whitespace-nowrap"
                              >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Remove Instrument
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete all trades
                                  associated with this instrument.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteInstrument(accountNumber, instrumentGroup)}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Enter a new name for the account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameAccount()
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newAccountName" className="text-right">
                  New Name
                </Label>
                <Input
                  id="newAccountName"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="col-span-3"
                  autoFocus
                  autoComplete="off"
                  placeholder="Enter new account name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={renameLoading || !newAccountName}
              >
                {renameLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={renameInstrumentDialogOpen} onOpenChange={setRenameInstrumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Instrument</DialogTitle>
            <DialogDescription>
              Enter a new name for the instrument.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameInstrument()
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newInstrumentName" className="text-right">
                  New Name
                </Label>
                <Input
                  id="newInstrumentName"
                  value={newInstrumentName}
                  onChange={(e) => setNewInstrumentName(e.target.value)}
                  className="col-span-3"
                  autoFocus
                  autoComplete="off"
                  placeholder="Enter new instrument name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={renameLoading || !newInstrumentName}
              >
                {renameLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 