'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TrashIcon } from "lucide-react"
import { fetchGroupedTrades, deleteInstrument, updateCommission } from "./actions"
import debounce from 'lodash/debounce'

interface Trade {
  id: string
  accountNumber: string
  instrument: string
  commission: number
}

type GroupedTrades = Record<string, Record<string, Trade[]>>

export default function DashboardPage() {
  const [trades, setTrades] = useState<GroupedTrades>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchGroupedTrades()
      .then((fetchedTrades) => {
        setTrades(fetchedTrades as GroupedTrades)
      })
      .catch((err) => setError(err instanceof Error ? err : new Error('An error occurred')))
      .finally(() => setLoading(false))
  }, [])

  const handleDeleteAccount = async (accountNumber: string) => {
    try {
      setLoading(true)
      await Promise.all(Object.keys(trades[accountNumber]).map(instrument => 
        deleteInstrument(accountNumber, instrument)
      ))
      setTrades((prevTrades) => {
        const newTrades = { ...prevTrades }
        delete newTrades[accountNumber]
        return newTrades
      })
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
      await deleteInstrument(accountNumber, instrument)
      setTrades((prevTrades) => {
        const newTrades = { ...prevTrades }
        delete newTrades[accountNumber][instrument]
        if (Object.keys(newTrades[accountNumber]).length === 0) {
          delete newTrades[accountNumber]
        }
        return newTrades
      })
    } catch (error) {
      console.error("Failed to delete instrument:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete instrument'))
    } finally {
      setLoading(false)
    }
  }

  const debouncedUpdateCommission = useCallback(
    debounce(async (accountNumber: string, instrument: string, newCommission: number) => {
      try {
        await updateCommission(accountNumber, instrument, newCommission)
        setTrades((prevTrades) => {
          const newTrades = { ...prevTrades }
          newTrades[accountNumber][instrument] = newTrades[accountNumber][instrument].map(trade => ({
            ...trade,
            commission: newCommission
          }))
          return newTrades
        })
      } catch (error) {
        console.error("Failed to update commission:", error)
        setError(error instanceof Error ? error : new Error('Failed to update commission'))
      }
    }, 500),
    []
  )

  const handleUpdateCommission = (accountNumber: string, instrument: string, newCommission: number) => {
    setLoading(true)
    debouncedUpdateCommission(accountNumber, instrument, newCommission)
    setLoading(false)
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
            {Object.entries(trades).map(([accountNumber, instruments]) => (
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
                            defaultValue={trades[0].commission}
                            className="w-32"
                            onChange={(e) => handleUpdateCommission(accountNumber, instrument, parseFloat(e.target.value))}
                          />
                          <Button 
                            variant="destructive" 
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