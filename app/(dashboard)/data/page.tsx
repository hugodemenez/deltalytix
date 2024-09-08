'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TrashIcon, AlertCircle, ChevronDown, ChevronUp, MoreVertical, Edit2 } from "lucide-react"
import { deleteAccount, deleteInstrumentGroup, updateCommissionForGroup, renameAccount, fetchGroupedTrades } from "./actions"
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
import { PrismaClient, Trade } from '@prisma/client'

type GroupedTrades = Record<string, Record<string, Trade[]>>

export default function DashboardPage() {
  const { trades, setTrades } = useTrades()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const [groupedTrades, setGroupedTrades] = useState<GroupedTrades>({})
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [accountToRename, setAccountToRename] = useState("")
  const [newAccountName, setNewAccountName] = useState("")

  useEffect(() => {
    if (!user) return
    const fetchTradesData = async () => {
      try {
        setLoading(true)
        const { groupedTrades: fetchedGroupedTrades, flattenedTrades } = await fetchGroupedTrades(user.id)
        setGroupedTrades(fetchedGroupedTrades)
        setTrades(flattenedTrades)
      } catch (error) {
        console.error("Failed to fetch trades:", error)
        setError(error instanceof Error ? error : new Error('Failed to fetch trades'))
      } finally {
        setLoading(false)
      }
    }
    fetchTradesData()
  }, [user, setTrades])

  const handleDeleteAccount = async (accountNumber: string) => {
    try {
      setLoading(true)
      await deleteAccount(accountNumber, user!.id)
      const { groupedTrades: updatedGroupedTrades, flattenedTrades } = await fetchGroupedTrades(user!.id)
      setGroupedTrades(updatedGroupedTrades)
      setTrades(flattenedTrades)
      toast({
        title: 'Account deleted successfully',
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete account:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete account'))
      toast({
        title: 'Failed to delete account',
        description: 'Please try again later',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInstrument = async (accountNumber: string, instrumentGroup: string) => {
    try {
      setLoading(true)
      await deleteInstrumentGroup(accountNumber, instrumentGroup, user!.id)
      const { groupedTrades: updatedGroupedTrades, flattenedTrades } = await fetchGroupedTrades(user!.id)
      setGroupedTrades(updatedGroupedTrades)
      setTrades(flattenedTrades)
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
        const { groupedTrades: updatedGroupedTrades, flattenedTrades } = await fetchGroupedTrades(userId)
        setGroupedTrades(updatedGroupedTrades)
        setTrades(flattenedTrades)
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
    [setTrades]
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
      setLoading(true)
      await renameAccount(accountToRename, newAccountName, user.id)
      const { groupedTrades: updatedGroupedTrades, flattenedTrades } = await fetchGroupedTrades(user.id)
      setGroupedTrades(updatedGroupedTrades)
      setTrades(flattenedTrades)
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
      setLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>
  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )

  return (
    <div className="py-4 sm:py-8 md:py-12 px-4 sm:px-6 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Trade Management Dashboard</CardTitle>
          <CardDescription>Manage accounts, instruments, and commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedTrades).map(([accountNumber, instruments]) => (
              <div key={accountNumber} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <button 
                    onClick={() => toggleAccountExpansion(accountNumber)}
                    className="flex items-center text-lg font-semibold focus:outline-none"
                    aria-expanded={expandedAccounts[accountNumber]}
                    aria-controls={`account-${accountNumber}`}
                  >
                    <span className="mr-2">Account: {accountNumber}</span>
                    {expandedAccounts[accountNumber] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2 hidden sm:flex"
                      onClick={() => {
                        setAccountToRename(accountNumber)
                        setRenameDialogOpen(true)
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="hidden sm:flex"
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account
                            and all associated instruments and trades.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAccount(accountNumber)}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="sm:hidden">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => {
                          setAccountToRename(accountNumber)
                          setRenameDialogOpen(true)
                        }}>
                          Rename Account
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              Delete Account
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the account
                                and all associated instruments and trades.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAccount(accountNumber)}>
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {expandedAccounts[accountNumber] && (
                  <div id={`account-${accountNumber}`} className="space-y-4 pl-2 sm:pl-4">
                    {Object.entries(instruments).map(([instrumentGroup, trades]) => (
                      <div key={instrumentGroup} className="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                          <h3 className="text-md font-medium mb-2 sm:mb-0">Instrument Group: {instrumentGroup}</h3>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                            <Input
                              type="number"
                              placeholder="Commission"
                              defaultValue={trades[0].commission}
                              className="w-full sm:w-32"
                              onChange={(e) => handleUpdateCommission(accountNumber, instrumentGroup, parseFloat(e.target.value), user)}
                              aria-label={`Update commission for instrument group ${instrumentGroup}`}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                >
                                  <TrashIcon className="w-4 h-4 mr-2" />
                                  Remove Group
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete all instruments
                                    and trades associated with this instrument group.
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
      </Card>
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Enter a new name for the account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                New Name
              </Label>
              <Input
                id="name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleRenameAccount}>
              Rename Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}