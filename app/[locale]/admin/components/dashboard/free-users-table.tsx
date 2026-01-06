'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getFreeUsers } from '../../actions/stats'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ArrowUpDown } from 'lucide-react'
import { Trade } from '@/prisma/generated/prisma/browser'

interface FreeUser {
  email: string
  trades: Trade[]
}

interface SortConfig {
  key: keyof FreeUser | 'tradeCount' | 'tradeStart' | 'tradeLast'
  direction: 'asc' | 'desc'
}

export function FreeUsersTable() {
  const [users, setUsers] = useState<FreeUser[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'email',
    direction: 'asc'
  })

  const fetchUsers = async () => {
    const data = await getFreeUsers()
    setUsers(data)
  }

  const sortData = (data: FreeUser[]) => {
    return [...data].sort((a, b) => {
      if (sortConfig.key === 'tradeCount') {
        return sortConfig.direction === 'asc'
          ? a.trades.length - b.trades.length
          : b.trades.length - a.trades.length
      } 
      else if (sortConfig.key === 'tradeStart'){
        const aFirst = a.trades.reduce((earliest, trade) => 
          trade.entryDate < earliest ? trade.entryDate : earliest,
          a.trades[0]?.entryDate || ''
        )
        const bFirst = b.trades.reduce((earliest, trade) => 
          trade.entryDate < earliest ? trade.entryDate : earliest,
          b.trades[0]?.entryDate || ''
        )
        return sortConfig.direction === 'asc'
          ? aFirst.localeCompare(bFirst) ?? 0
          : bFirst.localeCompare(aFirst) ?? 0
      }
      else if(sortConfig.key === 'tradeLast') {
        const aLatest = a.trades.reduce((latest, trade) => 
          trade.entryDate > latest ? trade.entryDate : latest, 
          a.trades[0]?.entryDate || ''
        )
        const bLatest = b.trades.reduce((latest, trade) => 
          trade.entryDate > latest ? trade.entryDate : latest,
          b.trades[0]?.entryDate || ''
        )
        return sortConfig.direction === 'asc'
          ? aLatest.localeCompare(bLatest) ?? 0
          : bLatest.localeCompare(aLatest) ?? 0
      }
      else {
        return sortConfig.direction === 'asc'
          ? a.email.localeCompare(b.email)
          : b.email.localeCompare(a.email)
      }
    })
  }

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  return (
    <div className="space-y-4">
      <Button onClick={fetchUsers} variant="outline">
        Refresh
      </Button>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-1"
                >
                  Email
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('tradeCount')}
                  className="flex items-center gap-1"
                >
                  Trades
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('tradeStart')}
                  className="flex items-center gap-1"
                >
                  startDate
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('tradeLast')}
                  className="flex items-center gap-1"
                >
                  lastDate
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortData(users).map((user) => (
              <TableRow key={user.email}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.trades.length}</TableCell>
                <TableCell>{user.trades[0]?.entryDate?.slice(0,10) || '-'}</TableCell>
                <TableCell>
                  {user.trades.length > 0 
                    ? user.trades.reduce((latest, trade) => 
                        trade.entryDate > latest ? trade.entryDate : latest,
                        user.trades[0].entryDate
                      ).slice(0,10)
                    : '-'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 