'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from '@/hooks/use-toast'
import { InfoIcon } from 'lucide-react'

const RITHMIC_GATEWAYS = [
  { id: 'test', name: 'Rithmic Test' },
  { id: 'r01', name: 'Rithmic 01' },
  { id: 'r04', name: 'Rithmic 04 Colo' },
  { id: 'paper', name: 'Rithmic Paper Trading' },
] as const

interface RithmicSyncProps {
  onSync: (data: any) => Promise<void>
}

export function RithmicSync({ onSync }: RithmicSyncProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [gateway, setGateway] = useState<string>('test')

  async function handleSync(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      toast({
        title: "Feature Under Development",
        description: "Direct Rithmic sync functionality is coming soon. Please use CSV import for now.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-5 w-5 text-yellow-500" />
        <AlertDescription>
          Direct Rithmic sync functionality is coming soon. Please use CSV import for now.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSync} className="space-y-4 opacity-50">
        <div className="space-y-2">
          <Label htmlFor="gateway">Gateway</Label>
          <Select value={gateway} onValueChange={setGateway} disabled>
            <SelectTrigger id="gateway">
              <SelectValue placeholder="Select a gateway" />
            </SelectTrigger>
            <SelectContent>
              {RITHMIC_GATEWAYS.map((gw) => (
                <SelectItem key={gw.id} value={gw.id}>
                  {gw.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" required disabled />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required disabled />
        </div>

        <Button type="submit" disabled>
          Connect Rithmic Account
        </Button>
      </form>
    </div>
  )
} 