'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { TrashIcon, AlertCircle, ChevronDown, ChevronUp, MoreVertical, Edit2, Loader2 } from "lucide-react"
import { 
  removeAccountsFromTradesAction, 
  deleteInstrumentGroupAction, 
  updateCommissionForGroupAction, 
  renameAccountAction,
  renameInstrumentAction 
} from "@/server/accounts"
import debounce from 'lodash/debounce'
import { useData } from '@/context/data-provider'
import { toast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Trade } from '@prisma/client'
import ExportButton from '@/components/export-button'
import { useI18n } from "@/locales/client"
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'

type GroupedTrades = Record<string, Record<string, Trade[]>>



export function DataManagementCard() {
  const t = useI18n()
  const user = useUserStore((state) => state.user)
  const trades = useTradesStore((state) => state.trades)

  const { refreshTrades } = useData()
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [renameLoading, setRenameLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [renameInstrumentDialogOpen, setRenameInstrumentDialogOpen] = useState(false)
  const [renameAccountDialogOpen, setRenameAccountDialogOpen] = useState(false)
  const [accountToRename, setAccountToRename] = useState("")
  const [newAccountNumber, setNewAccountNumber] = useState("")
  const [instrumentToRename, setInstrumentToRename] = useState({ accountNumber: "", currentName: "" })
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
        setGroupedTrades(getGroupedTrades)
      } catch (error) {
        console.error("Failed to fetch trades:", error)
        setError(error instanceof Error ? error : new Error('Failed to fetch trades'))
      }
    }
    fetchTradesData()
  }, [user, trades, getGroupedTrades])

  const handleDeleteAccounts = useCallback(async () => {
    if (!user) return
    try {
      setDeleteLoading(true)
      const accountsToDelete = deleteMode === 'all' ? Object.keys(groupedTrades) : selectedAccounts
      await removeAccountsFromTradesAction(accountsToDelete)
      await refreshTrades()
      setSelectedAccounts([])
      toast({
        title: accountsToDelete.length > 1 ? t('dataManagement.toast.accountsDeleted') : t('dataManagement.toast.accountDeleted'),
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete accounts:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete accounts'))
      toast({
        title: t('dataManagement.toast.deleteError'),
        description: t('dataManagement.toast.deleteErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [user, deleteMode, groupedTrades, selectedAccounts, refreshTrades, t])

  const handleDeleteInstrument = useCallback(async (accountNumber: string, instrumentGroup: string) => {
    try {
      await deleteInstrumentGroupAction(accountNumber, instrumentGroup, user!.id)
      await refreshTrades()
      toast({
        title: t('dataManagement.toast.instrumentDeleted'),
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete instrument group:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete instrument group'))
      toast({
        title: t('dataManagement.toast.instrumentDeleteError'),
        description: t('dataManagement.toast.deleteErrorDesc'),
        variant: 'destructive',
      })
    }
  }, [user, refreshTrades, t])

  const debouncedUpdateCommission = useMemo(
    () => debounce(async (accountNumber: string, instrumentGroup: string, newCommission: number) => {
      try {
        await updateCommissionForGroupAction(accountNumber, instrumentGroup, newCommission)
        await refreshTrades()
        toast({
          title: t('dataManagement.toast.commissionUpdated'),
          variant: 'default',
        })
      } catch (error) {
        console.error("Failed to update commission:", error)
        setError(error instanceof Error ? error : new Error('Failed to update commission'))
        toast({
          title: t('dataManagement.toast.commissionError'),
          description: t('dataManagement.toast.deleteErrorDesc'),
          variant: 'destructive',
        })
      }
    }, 1000),
    [refreshTrades, t]
  )

  const handleUpdateCommission = useCallback((accountNumber: string, instrumentGroup: string, newCommission: number) => {
    debouncedUpdateCommission(accountNumber, instrumentGroup, newCommission)
  }, [debouncedUpdateCommission])

  const toggleAccountExpansion = useCallback((accountNumber: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountNumber]: !prev[accountNumber]
    }))
  }, [])

  const handleRenameInstrument = useCallback(async () => {
    if (!user || !instrumentToRename.currentName || !newInstrumentName) return
    try {
      setRenameLoading(true)
      await renameInstrumentAction(instrumentToRename.accountNumber, instrumentToRename.currentName, newInstrumentName)
      await refreshTrades()
      toast({
        title: t('dataManagement.toast.instrumentRenamed'),
        variant: 'default',
      })
      setRenameInstrumentDialogOpen(false)
      setInstrumentToRename({ accountNumber: "", currentName: "" })
      setNewInstrumentName("")
    } catch (error) {
      console.error("Failed to rename instrument:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename instrument'))
      toast({
        title: t('dataManagement.toast.instrumentRenameError'),
        description: error instanceof Error ? error.message : t('dataManagement.toast.deleteErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setRenameLoading(false)
    }
  }, [user, instrumentToRename, newInstrumentName, refreshTrades, t])

  const handleSelectAccount = useCallback((accountNumber: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountNumber)
        ? prev.filter(acc => acc !== accountNumber)
        : [...prev, accountNumber]
    )
  }, [])

  const handleRenameAccount = useCallback(async () => {
    if (!user || !accountToRename || !newAccountNumber) return
    try {
      setRenameLoading(true)
      await renameAccountAction(accountToRename, newAccountNumber)
      await refreshTrades()
      toast({
        title: t('dataManagement.toast.accountRenamed'),
        variant: 'default',
      })
      setRenameAccountDialogOpen(false)
      setAccountToRename("")
      setNewAccountNumber("")
    } catch (error) {
      console.error("Failed to rename account:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename account'))
      toast({
        title: t('dataManagement.toast.accountRenameError'),
        description: error instanceof Error ? error.message : t('dataManagement.toast.deleteErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setRenameLoading(false)
    }
  }, [user, accountToRename, newAccountNumber, refreshTrades, t])

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
          <span className="text-xl md:text-2xl">{t('dataManagement.title')}</span>
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
                      {t('dataManagement.deleting')}
                    </>
                  ) : (
                    <>{t('dataManagement.deleteSelected')} ({selectedAccounts.length})</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('dataManagement.deleteConfirm.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('dataManagement.deleteConfirm.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('dataManagement.deleteConfirm.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccounts} disabled={deleteLoading}>
                    {deleteLoading ? t('dataManagement.deleting') : t('dataManagement.deleteConfirm.continue')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                      {t('dataManagement.deleting')}
                    </>
                  ) : (
                    <>{t('dataManagement.deleteAll')}</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('dataManagement.deleteConfirm.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('dataManagement.deleteConfirm.allDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('dataManagement.deleteConfirm.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccounts} disabled={deleteLoading}>
                    {deleteLoading ? t('dataManagement.deleting') : t('dataManagement.deleteConfirm.continue')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardTitle>
        <CardDescription>{t('dataManagement.description')}</CardDescription>
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
                            <span className="sr-only">{t('dataManagement.moreOptions')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setAccountToRename(accountNumber)
                              setRenameAccountDialogOpen(true)
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            {t('dataManagement.renameAccount')}
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
                            {t('dataManagement.deleteAccount')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center w-auto justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccountToRename(accountNumber)
                      setRenameAccountDialogOpen(true)
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('dataManagement.rename')}
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
                    {t('dataManagement.delete')}
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
                            <span className="sr-only">{t('dataManagement.renameInstrument.title')}</span>
                          </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <div className="relative w-full sm:w-32">
                            <Input
                              type="number"
                              placeholder="Commission"
                              defaultValue={trades[0].commission / trades[0].quantity}
                              className="w-full"
                              onChange={(e) => handleUpdateCommission(accountNumber, instrumentGroup, parseFloat(e.target.value))}
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
                                {t('dataManagement.removeInstrument')}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('dataManagement.deleteInstrument.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('dataManagement.deleteInstrument.description')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('dataManagement.deleteConfirm.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteInstrument(accountNumber, instrumentGroup)}>
                                  {t('dataManagement.deleteConfirm.continue')}
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
      <Dialog open={renameInstrumentDialogOpen} onOpenChange={setRenameInstrumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dataManagement.renameInstrument.title')}</DialogTitle>
            <DialogDescription>
              {t('dataManagement.renameInstrument.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameInstrument()
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newInstrumentName" className="text-right">
                  {t('dataManagement.renameInstrument.newName')}
                </Label>
                <Input
                  id="newInstrumentName"
                  value={newInstrumentName}
                  onChange={(e) => setNewInstrumentName(e.target.value)}
                  className="col-span-3"
                  autoFocus
                  autoComplete="off"
                  placeholder={t('dataManagement.renameInstrument.placeholder')}
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
                    {t('dataManagement.renameDialog.renaming')}
                  </>
                ) : (
                  t('dataManagement.rename')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={renameAccountDialogOpen} onOpenChange={setRenameAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dataManagement.renameAccount.title')}</DialogTitle>
            <DialogDescription>
              {t('dataManagement.renameAccount.description')}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('dataManagement.renameAccount.warning')}</AlertTitle>
          </Alert>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameAccount()
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newAccountNumber" className="text-right">
                  {t('dataManagement.renameAccount.newNumber')}
                </Label>
                <Input
                  id="newAccountNumber"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="col-span-3"
                  autoFocus
                  autoComplete="off"
                  placeholder={t('dataManagement.renameAccount.placeholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={renameLoading || !newAccountNumber}
              >
                {renameLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('dataManagement.renameDialog.renaming')}
                  </>
                ) : (
                  t('dataManagement.rename')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 