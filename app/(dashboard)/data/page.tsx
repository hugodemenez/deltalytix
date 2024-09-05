'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TrashIcon } from "lucide-react"
import { fetchGroupedTrades, deleteInstrument, updateCommission } from "./actions"
import debounce from 'lodash/debounce'
import { useUser } from '@/components/context/user-data'
import { getTrades } from '@/server/database'
import { useTrades } from '@/components/context/trades-data'
import { toast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'

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

  useEffect(() => {
    console.log(user)
    if (!user) return
    const groupedTrades = trades.reduce<GroupedTrades>((acc, trade) => {
      if (!acc[trade.accountNumber]) {
        acc[trade.accountNumber] = {}
      }
      if (!acc[trade.accountNumber][trade.instrument]) {
        acc[trade.accountNumber][trade.instrument] = []
      }
      acc[trade.accountNumber][trade.instrument].push(trade)
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
    } catch (error) {
      console.error("Failed to delete account:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete account'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInstrument = async (accountNumber: string, instrument: string) => {
    try {
      setLoading(true)
      await deleteInstrument(accountNumber, instrument, user!.id)
      setTrades(await getTrades(user!.id))
    } catch (error) {
      console.error("Failed to delete instrument:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete instrument'))
    } finally {
      setLoading(false)
    }
  }

  const debouncedUpdateCommission = useCallback(
    debounce(async (accountNumber: string, instrument: string, newCommission: number, user: User) => {
      try {
        await updateCommission(accountNumber, instrument, newCommission)
      } catch (error) {
        console.error("Failed to update commission:", error)
        setError(error instanceof Error ? error : new Error('Failed to update commission'))
      }
      finally{
        setTrades(await getTrades(user!.id))
        toast({
          title: 'Commission updated successfully',
          variant: 'default',
        })
      }
    }, 500),
    []
  )

  const handleUpdateCommission = (accountNumber: string, instrument: string, newCommission: number, user: User | null) => {
    if (!user) return
    debouncedUpdateCommission(accountNumber, instrument, newCommission, user)
  }

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>
  if (error) return <div className="flex justify-center items-center h-screen text-red-500">Error: {error.message}</div>

  return (
    <div className="container mx-auto p-4">
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
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAccount(accountNumber)}
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
                <div className="space-y-4 pl-4">
                  {Object.entries(instruments).map(([instrument, trades]) => (
                    <div key={instrument} className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="text-md font-medium">Instrument: {instrument}</h3>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="Commission"
                            defaultValue={Array.isArray(trades) && trades.length > 0 ? trades[0].commission : 0}
                            className="w-32"
                            onChange={(e) => handleUpdateCommission(accountNumber, instrument, parseFloat(e.target.value), user)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInstrument(accountNumber, instrument)}
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Remove Instrument
                          </Button>
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