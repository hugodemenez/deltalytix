'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { useUserData } from '@/components/context/user-data'
import { toast } from '@/hooks/use-toast'
import { RithmicSyncFeedback } from './rithmic-sync-feedback'
import { useWebSocket } from '@/components/context/rithmic-sync-context'
import { saveRithmicData, getRithmicData, clearRithmicData, generateCredentialId, getAllRithmicData, RithmicCredentialSet } from '@/lib/rithmic-storage'
import { RithmicCredentialsManager } from './rithmic-credentials-manager'
import { useI18n } from '@/locales/client'
import Image from 'next/image'
import { AccountComparisonDialog } from './account-comparison-dialog'

interface RithmicCredentials {
  username: string
  password: string
  server_type: string
  location: string
  userId: string
}

interface ServerConfigurations {
  [key: string]: string[]
}

interface RithmicAccount {
  account_id: string
  fcm_id: string
}

interface RithmicOrder {
  order_id: string
  account_id: string
  ticker: string
  exchange: string
  buy_sell_type: string
  order_type: string
  status: string
  quantity: number
  filled_quantity: number
  price: number
  commission: number
  timestamp: number
}

interface RithmicSyncCombinedProps {
  onSync: (data: { credentials: RithmicCredentials, orders: Record<string, any>[] }) => Promise<void>
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function RithmicSyncCombined({ onSync, setIsOpen }: RithmicSyncCombinedProps) {
  const { user, trades } = useUserData()
  const { 
    connect, 
    disconnect, 
    isConnected, 
    lastMessage, 
    connectionStatus, 
    orders: wsOrders,
    selectedAccounts,
    setSelectedAccounts,
    availableAccounts,
    setAvailableAccounts,
    processingStats,
    resetProcessingState,
    feedbackMessages,
    messageHistory,
    handleMessage,
    step,
    setStep,
    showAccountComparisonDialog,
    setShowAccountComparisonDialog,
    compareAccounts
  } = useWebSocket()

  const [isLoading, setIsLoading] = useState(false)
  const [serverConfigs, setServerConfigs] = useState<ServerConfigurations>({})
  const [token, setToken] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [shouldAutoConnect, setShouldAutoConnect] = useState(false)
  const [credentials, setCredentials] = useState<RithmicCredentials>({
    username: '',
    password: '',
    server_type: 'Rithmic Paper Trading',
    location: 'Chicago Area',
    userId: user?.id || ''
  })
  const [shouldSaveCredentials, setShouldSaveCredentials] = useState(true)
  const [showCredentialsManager, setShowCredentialsManager] = useState(true)
  const [currentCredentialId, setCurrentCredentialId] = useState<string | null>(null)
  const t = useI18n()

  const handleConnect = useCallback(async (event: React.FormEvent, isAutoConnect: boolean = false) => {
    event.preventDefault()
    setIsLoading(true)

    // Disconnect existing WebSocket connection if any
    if (isConnected) {
      console.log('Disconnecting existing WebSocket connection before new connection attempt')
      disconnect()
    }

    try {
      const isLocalhost = process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
      const protocol = isLocalhost ? window.location.protocol : 'https:'
      
      const payload = {
        username: credentials.username,
        password: credentials.password,
        server_type: credentials.server_type,
        location: credentials.location,
        userId: credentials.userId
      }

      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 seconds timeout

      const response = await fetch(`${protocol}//${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Handle rate limit error specifically
      if (response.status === 429) {
        const data = await response.json()
        throw new Error(data.detail || 'Rate limit exceeded. Please try again later.')
      }

      const data = await response.json()
      console.log('Account response:', data)

      if (!data.success) {
        throw new Error(data.message || t('rithmic.error.invalidCredentials'))
      }

      setAvailableAccounts(data.accounts)
      setToken(data.token)
      const wsProtocol = isLocalhost ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') : 'wss:'
      setWsUrl(data.websocket_url.replace('ws://your-domain', 
        `${wsProtocol}//${process.env.NEXT_PUBLIC_API_URL}`))
      console.log('Token set:', data.token)
      console.log('WebSocket URL set:', data.websocket_url)
      
      // Always go to account selection when editing credentials
      setStep('select-accounts')
      
      // Send success message
      handleMessage({
        type: 'log',
        level: 'info',
        message: `Retrieved ${data.accounts.length} accounts. Please select accounts and click "Start Processing"`
      })
    } catch (error: unknown) {
      console.error('Connection error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Show error toast
      toast({
        title: t('rithmic.error.connectionFailed'),
        description: error instanceof DOMException && error.name === 'AbortError' 
          ? t('rithmic.error.timeout')
          : errorMessage,
        variant: "destructive"
      })

      // Reset form if it's a timeout or invalid credentials
      if (error instanceof DOMException && error.name === 'AbortError' || 
          errorMessage.includes('invalid credentials')) {
        setCredentials({
          username: '',
          password: '',
          server_type: 'Rithmic Paper Trading',
          location: 'Chicago Area',
          userId: user?.id || ''
        })
      }

      handleMessage({
        type: 'log',
        level: 'error',
        message: `Connection error: ${errorMessage}`
      })
    } finally {
      setIsLoading(false)
    }
  }, [
    credentials, 
    isConnected, 
    disconnect, 
    t, 
    selectedAccounts, 
    connect, 
    handleMessage, 
    calculateStartDate, 
    user?.id
  ])

  // Handle selecting a credential from the manager
  const handleSelectCredential = useCallback((credential: RithmicCredentialSet) => {
    setCredentials({
      ...credential.credentials,
      password: credential.credentials.password,
      userId: user?.id || ''
    })
    setSelectedAccounts(credential.selectedAccounts)
    setCurrentCredentialId(credential.id)
    setShouldSaveCredentials(true)
    setShowCredentialsManager(false)
    setShouldAutoConnect(true)
  }, [user?.id])

  // Effect to handle auto-connect only when editing from credentials manager
  useEffect(() => {
    if (shouldAutoConnect && credentials.username && credentials.password) {
      setShouldAutoConnect(false)
      handleConnect(new Event('submit') as any, false)
    }
  }, [shouldAutoConnect, credentials, handleConnect])

  // Load saved data on mount
  useEffect(() => {
    const allData = getAllRithmicData()
    const lastCredential = Object.values(allData)[0] // Get first saved credential
    if (lastCredential && user?.id) {
      setCredentials({
        ...lastCredential.credentials,
        userId: user.id
      })
      setSelectedAccounts(lastCredential.selectedAccounts)
      setShouldSaveCredentials(true)
    }
  }, [user?.id])

  // Update the saveCredentialsAndAccounts function to use the current credential ID
  const saveCredentialsAndAccounts = useCallback(() => {
    if (shouldSaveCredentials) {
      const dataToSave = {
        id: currentCredentialId || generateCredentialId(),
        credentials: {
          username: credentials.username,
          password: credentials.password,
          server_type: credentials.server_type,
          location: credentials.location
        },
        selectedAccounts,
        lastSyncTime: new Date().toISOString()
      }
      saveRithmicData(dataToSave)
      setCurrentCredentialId(dataToSave.id)
    }
  }, [credentials, selectedAccounts, shouldSaveCredentials, currentCredentialId])

  // Reset state when component mounts (modal opens)
  useEffect(() => {
    resetProcessingState()
    setStep('credentials')
    setIsLoading(false)
    setToken(null)
    setWsUrl(null)
    setShouldAutoConnect(false)
    setShowCredentialsManager(true)
    setCredentials({
      username: '',
      password: '',
      server_type: 'Rithmic Paper Trading',
      location: 'Chicago Area',
      userId: user?.id || ''
    })
  }, [resetProcessingState, user?.id])

  // Close modal when processing is complete
  useEffect(() => {
    if (processingStats.isComplete) {
      const timeoutId = setTimeout(() => {
        disconnect()
        setIsOpen(false)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [processingStats.isComplete, setIsOpen, disconnect])

  // Update userId when user changes
  useEffect(() => {
    if (user?.id) {
      setCredentials(prev => ({ ...prev, userId: user.id }))
    }
  }, [user])

  // Fetch server configurations on mount and set defaults
  useEffect(() => {
    async function fetchServerConfigs() {
      try {
        const isLocalhost = process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
        const protocol = isLocalhost ? window.location.protocol : 'https:'
        const response = await fetch(`${protocol}//${process.env.NEXT_PUBLIC_API_URL}/servers`)
        const data = await response.json()
        
        if (data.success) {
          setServerConfigs(data.servers)
          
          // Verify if our defaults exist in the server configs
          const hasDefaultServer = 'Rithmic Paper Trading' in data.servers
          const hasDefaultLocation = hasDefaultServer && data.servers['Rithmic Paper Trading'].includes('Chicago Area')
          
          // If defaults don't exist, set to first available options
          if (!hasDefaultServer || !hasDefaultLocation) {
            const firstServerType = Object.keys(data.servers)[0]
            const firstLocation = data.servers[firstServerType][0]
            
            setCredentials(prev => ({
              ...prev,
              server_type: firstServerType,
              location: firstLocation
            }))
          }
        } else {
          throw new Error(data.message)
        }
      } catch (error) {
        console.error('Failed to fetch server configurations:', error)
      }
    }
    
    fetchServerConfigs()
  }, [])

  // Update effect to use context step
  useEffect(() => {
    if (isConnected && selectedAccounts.length > 0) {
      console.log('Active connection detected, resuming processing view')
      setStep('processing')
    }
  }, [isConnected, selectedAccounts, setStep])

  function handleStartProcessing() {
    setIsLoading(true)
    setStep('processing')

    if (!token || !wsUrl) {
      setIsLoading(false)
      return
    }

    saveCredentialsAndAccounts()
    const startDate = calculateStartDate(selectedAccounts)
    console.log('Connecting to WebSocket:', wsUrl)
    connect(wsUrl, token, selectedAccounts, startDate)
  }

  function calculateStartDate(selectedAccounts: string[]): string {
    // Filter trades for selected accounts
    const accountTrades = trades.filter(trade => selectedAccounts.includes(trade.accountNumber))
    
    if (accountTrades.length === 0) {
      // If no trades found, return date 90 days ago
      const date = new Date()
      date.setDate(date.getDate() - 91)
      return date.toISOString().slice(0, 10).replace(/-/g, '')
    }

    // Find the most recent trade date for each account
    const accountDates = selectedAccounts.map(accountId => {
      const accountTrades = trades.filter(trade => trade.accountNumber === accountId)
      if (accountTrades.length === 0) return null
      return Math.max(...accountTrades.map(trade => new Date(trade.entryDate).getTime()))
    }).filter(Boolean) as number[]

    // Get the oldest most recent date across all accounts
    const oldestRecentDate = new Date(Math.min(...accountDates))
    
    // Set to next day
    oldestRecentDate.setDate(oldestRecentDate.getDate() + 1)
    
    // Format as YYYYMMDD
    return oldestRecentDate.toISOString().slice(0, 10).replace(/-/g, '')
  }

  // Handle account selection from comparison dialog
  const handleAccountSelectionConfirm = useCallback((selectedAccounts: string[]) => {
    setSelectedAccounts(selectedAccounts)
    setShowAccountComparisonDialog(false)
    
    // If this was triggered during auto-sync, proceed with sync
    if (token && wsUrl) {
      const startDate = calculateStartDate(selectedAccounts)
      connect(wsUrl, token, selectedAccounts, startDate)
    }
  }, [token, wsUrl, connect, calculateStartDate])

  return (
    <div className="space-y-6">
      <AccountComparisonDialog
        isOpen={showAccountComparisonDialog}
        onClose={() => setShowAccountComparisonDialog(false)}
        savedAccounts={selectedAccounts}
        availableAccounts={availableAccounts}
        onConfirm={handleAccountSelectionConfirm}
      />
      {showCredentialsManager ? (
        <RithmicCredentialsManager
          onSelectCredential={handleSelectCredential}
          onAddNew={() => {
            setShowCredentialsManager(false)
            setSelectedAccounts([])
            setAvailableAccounts([])
            setCredentials({
              username: '',
              password: '',
              server_type: 'Rithmic Paper Trading',
              location: 'Chicago Area',
              userId: user?.id || ''
            })
            setCurrentCredentialId(null)
          }}
        />
      ) : (
        <>
          {step === 'credentials' && (
            <form onSubmit={(e) => handleConnect(e, false)} className="space-y-4" autoComplete="on">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {currentCredentialId ? t('rithmic.editCredentials') : t('rithmic.addNewCredentials')}
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCredentialsManager(true)}
                >
                  {t('rithmic.backToList')}
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rithmic-username">{t('rithmic.usernameLabel')}</Label>
                <Input 
                  id="rithmic-username" 
                  name="username"
                  autoComplete="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  spellCheck="false"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rithmic-password">{t('rithmic.passwordLabel')}</Label>
                <Input 
                  id="rithmic-password" 
                  name="password"
                  type="password" 
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="server-type">{t('rithmic.serverTypeLabel')}</Label>
                <Select
                  name="server-type"
                  value={credentials.server_type}
                  onValueChange={(value) => {
                    setCredentials(prev => ({ 
                      ...prev, 
                      server_type: value,
                      location: '' // Reset location when server type changes
                    }))
                  }}
                >
                  <SelectTrigger id="server-type">
                    <SelectValue placeholder={t('rithmic.selectServerType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(serverConfigs).map((serverType) => (
                      <SelectItem key={serverType} value={serverType}>
                        {serverType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('rithmic.locationLabel')}</Label>
                <Select
                  name="location"
                  value={credentials.location}
                  onValueChange={(value) => setCredentials(prev => ({ ...prev, location: value }))}
                  disabled={!credentials.server_type}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder={t('rithmic.selectLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials.server_type && serverConfigs[credentials.server_type]?.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="save-credentials"
                  checked={shouldSaveCredentials}
                  onCheckedChange={(checked) => setShouldSaveCredentials(checked as boolean)}
                />
                <Label 
                  htmlFor="save-credentials"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {currentCredentialId ? t('rithmic.updateSavedCredentials') : t('rithmic.saveForNextLogin')}
                </Label>
              </div>

              <div className="flex justify-between">
                <Button 
                  type="submit" 
                  disabled={isLoading || !credentials.server_type || !credentials.location} 
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('rithmic.getAccounts')}
                </Button>
              </div>
            </form>
          )}

          {step === 'select-accounts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('rithmic.selectAccountsTitle')}</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <Checkbox
                    id="select-all"
                    checked={availableAccounts.length > 0 && selectedAccounts.length === availableAccounts.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAccounts(availableAccounts.map(account => account.account_id))
                      } else {
                        setSelectedAccounts([])
                      }
                    }}
                  />
                  <Label 
                    htmlFor="select-all"
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {t('rithmic.selectAllAccounts')}
                  </Label>
                </div>
                {availableAccounts.map((account) => (
                  <div key={account.account_id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <Checkbox
                      id={account.account_id}
                      checked={selectedAccounts.includes(account.account_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAccounts([...selectedAccounts, account.account_id])
                        } else {
                          setSelectedAccounts(selectedAccounts.filter(id => id !== account.account_id))
                        }
                      }}
                    />
                    <Label 
                      htmlFor={account.account_id}
                      className="flex-1 cursor-pointer"
                    >
                      {account.account_id} 
                      <span className="text-sm text-muted-foreground ml-2">
                        ({t('rithmic.fcmId')}: {account.fcm_id})
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="save-accounts"
                  checked={shouldSaveCredentials}
                  onCheckedChange={(checked) => setShouldSaveCredentials(checked as boolean)}
                />
                <Label 
                  htmlFor="save-accounts"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {t('rithmic.rememberSelectedAccounts')}
                </Label>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('credentials')
                    setSelectedAccounts([])
                    setAvailableAccounts([])
                  }}
                  disabled={isLoading}
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleStartProcessing}
                  disabled={isLoading || selectedAccounts.length === 0}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t(`rithmic.startProcessing.${selectedAccounts.length === 1 ? 'one' : 'other'}`, { count: selectedAccounts.length })}
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-4">
              <RithmicSyncFeedback 
                totalAccounts={selectedAccounts.length}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface RithmicSyncWrapperProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function RithmicSyncWrapper({ setIsOpen }: RithmicSyncWrapperProps) {
  const t = useI18n()
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t('import.type.rithmicLogin')}</h2>
      <RithmicSyncCombined 
        setIsOpen={setIsOpen}
        onSync={async () => {}} 
      />
      <div className="mt-6 text-xs text-muted-foreground space-y-2 border-t pt-4">
        <div className="flex items-center gap-4 mb-2">
          <Image 
            src="/RithmicArtwork/TradingPlatformByRithmic-Black.png"
            alt="Trading Platform by Rithmic"
            width={120}
            height={40}
            className="dark:hidden"
          />
          <Image 
            src="/RithmicArtwork/TradingPlatformByRithmic-Green.png"
            alt="Trading Platform by Rithmic"
            width={120}
            height={40}
            className="hidden dark:block"
          />
          <Image 
            src="/RithmicArtwork/Powered_by_Omne.png"
            alt="Powered by OMNE"
            width={120}
            height={40}
          />
        </div>
        <p>{t('import.type.copyright.rithmic')}</p>
        <p>{t('import.type.copyright.protocol')}</p>
        <p>{t('import.type.copyright.platform')}</p>
        <p>{t('import.type.copyright.omne')}</p>
      </div>
    </div>
  )
}


