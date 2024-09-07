'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TrashIcon, AlertCircle } from "lucide-react"
import { deleteInstrument, updateCommission } from "./actions"
import debounce from 'lodash/debounce'
import { useUser } from '@/components/context/user-data'
import { getTrades } from '@/server/database'
import { useTrades } from '@/components/context/trades-data'
import { toast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface Trade {
  id: string
  accountNumber: string
  instrument: string
  commission: number
}

type GroupedTrades = Record<string, Record<string, Trade[]>>

export default function DashboardPage() {
  const { trades, setTrades } = useTrades()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const [groupedTrades, setGroupedTrades] = useState<GroupedTrades>({})
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'account' | 'instrument', accountNumber: string, instrument?: string } | null>(null)

  useEffect(() => {
    if (!user) return
    const groupedTrades = trades.reduce<GroupedTrades>((acc, trade) => {
      if (!acc[trade.accountNumber]) {
        acc[trade.accountNumber] = {}
      }
      const instrumentKey = trade.instrument.slice(0, 2)
      if (!acc[trade.accountNumber][instrumentKey]) {
        acc[trade.accountNumber][instrumentKey] = []
      }
      acc[trade.accountNumber][instrumentKey].push(trade)
      return acc
    }, {})
    setGroupedTrades(groupedTrades)
    setLoading(false)
  }, [trades, user])

  const handleDeleteAccount = async (accountNumber: string) => {
    try {
      setLoading(true)
      await Promise.all(Object.keys(groupedTrades[accountNumber]).map(instrument =>
        deleteInstrument(accountNumber, instrument, user!.id)
      ))
      setTrades(await getTrades(user!.id))
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
      setDeleteConfirmation(null)
    }
  }

  const handleDeleteInstrument = async (accountNumber: string, instrumentGroup: string) => {
    try {
      setLoading(true)
      const instrumentsToDelete = groupedTrades[accountNumber][instrumentGroup].map(trade => trade.instrument)
      await Promise.all(instrumentsToDelete.map(instrument => 
        deleteInstrument(accountNumber, instrument, user!.id)
      ))
      setTrades(await getTrades(user!.id))
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
      setDeleteConfirmation(null)
    }
  }

  const debouncedUpdateCommission = useCallback(
    debounce(async (accountNumber: string, instrumentGroup: string, newCommission: number, user: User) => {
      try {
        const instrumentsToUpdate = groupedTrades[accountNumber][instrumentGroup].map(trade => trade.instrument)
        await Promise.all(instrumentsToUpdate.map(instrument => 
          updateCommission(accountNumber, instrument, newCommission)
        ))
        setTrades(await getTrades(user.id))
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
    }, 500),
    [groupedTrades]
  )

  const handleUpdateCommission = (accountNumber: string, instrumentGroup: string, newCommission: number, user: User | null) => {
    if (!user) return
    debouncedUpdateCommission(accountNumber, instrumentGroup, newCommission, user)
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
    <div className="py-12">
      <Card>
        <CardHeader>
          <CardTitle>Trade Management Dashboard</CardTitle>
          <CardDescription>Manage accounts, instruments, and commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(groupedTrades).map(([accountNumber, instruments]) => (
              <div key={accountNumber} className="border-b pb-6 last:border-b-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Account: {accountNumber}</h2>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
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
                </div>
                <div className="space-y-4 pl-4">
                  {Object.entries(instruments).map(([instrumentGroup, trades]) => (
                    <div key={instrumentGroup} className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-medium">Instrument Group: {instrumentGroup}</h3>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="Commission"
                            defaultValue={trades[0].commission}
                            className="w-32"
                            onChange={(e) => handleUpdateCommission(accountNumber, instrumentGroup, parseFloat(e.target.value), user)}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Remove Instrument Group
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}