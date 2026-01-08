'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { toast } from 'sonner'
import { RithmicSyncFeedback } from './rithmic-sync-progress'
import { useSyncContext } from '@/context/sync-context'
import { useRithmicSyncStore } from '@/store/rithmic-sync-store'
import { saveRithmicData, getRithmicData, clearRithmicData, generateCredentialId, getAllRithmicData, RithmicCredentialSet } from '@/lib/rithmic-storage'
import { RithmicCredentialsManager } from './rithmic-credentials-manager'
import { useI18n } from '@/locales/client'
import Image from 'next/image'
import { useUserStore } from '@/store/user-store'
import { setRithmicSynchronization } from './actions'

interface RithmicCredentials {
  username: string
  password: string
  server_type: string
  location: string
  userId: string
}

interface RithmicSyncConnectionProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function RithmicSyncConnection({ setIsOpen }: RithmicSyncConnectionProps) {
  const user = useUserStore(state => state.user)
  const { rithmic } = useSyncContext()
  const { 
    connect, 
    disconnect, 
    isConnected, 
    handleMessage,
    authenticateAndGetAccounts,
    calculateStartDate
  } = rithmic
  
  const {
    selectedAccounts,
    setSelectedAccounts,
    availableAccounts,
    setAvailableAccounts,
    processingStats,
    resetProcessingState,
    step,
    setStep
  } = useRithmicSyncStore()

  const [isLoading, setIsLoading] = useState(false)
  const [shouldAutoConnect, setShouldAutoConnect] = useState(false)
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [serverConfigs, setServerConfigs] = useState<Record<string, string[]>>({})
  
  // Local fetchServerConfigs function
  const fetchServerConfigs = useCallback(async () => {
    try {
      const isLocalhost = process.env.NEXT_PUBLIC_RITHMIC_API_URL?.includes('localhost')
      const http = isLocalhost ? window.location.protocol : 'https:'
      const response = await fetch(`${http}//${process.env.NEXT_PUBLIC_RITHMIC_API_URL}/servers`)
      const data = await response.json()

      if (data.success) {
        setServerConfigs(data.servers)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Failed to fetch server configurations:', error)
    }
  }, [])
  
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
  const [allAccounts, setAllAccounts] = useState(true)
  const [accountSearch, setAccountSearch] = useState('')
  const t = useI18n()

  const isLegacyCredentialId = useCallback(
    (id: string | null) => !!id && id.startsWith('rithmic_'),
    []
  )

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return availableAccounts
    const searchLower = accountSearch.toLowerCase()
    return availableAccounts.filter(account => 
      account.account_id.toLowerCase().includes(searchLower) ||
      account.fcm_id.toLowerCase().includes(searchLower)
    )
  }, [availableAccounts, accountSearch])

  const handleConnect = useCallback(async (event: React.FormEvent, isAutoConnect: boolean = false) => {
    event.preventDefault()
    setIsLoading(true)

    // Disconnect existing WebSocket connection if any
    if (isConnected) {
      console.log('Disconnecting existing WebSocket connection before new connection attempt')
      disconnect()
    }

    try {
      const result = await authenticateAndGetAccounts(credentials)
      
      if (!result.success) {
        // Handle rate limit error without showing console error
        if (result.rateLimited) {
          toast.error(t('rithmic.rateLimit.title'), {
            description: t('rithmic.rateLimit.description', {
              max: 2,
              period: 15,
              wait: 8
            })
          })
          return
        }
        throw new Error(result.message)
      }

      setAvailableAccounts(result.accounts)
      setToken(result.token)
      setWsUrl(result.websocket_url)
      
      // Always go to account selection when editing credentials
      setStep('select-accounts')
      
      // Send success message
      handleMessage({
        type: 'log',
        level: 'info',
        message: `Retrieved ${result.accounts.length} accounts. Please select accounts and click "Start Processing"`
      })
    } catch (error: unknown) {
      // Only show console error for non-rate-limit errors
      if (!(error instanceof Error && error.message.includes('Rate limit exceeded'))) {
        console.error('Connection error:', error)
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Show error toast
      toast.error(t('rithmic.error.connectionFailed'), {
        description: error instanceof DOMException && error.name === 'AbortError' 
          ? t('rithmic.error.timeout')
          : errorMessage,
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
    handleMessage, 
    user?.id,
    authenticateAndGetAccounts,
    setAvailableAccounts,
    setStep,
    setToken,
    setWsUrl,
  ])

  // Handle selecting a credential from the manager
  const handleSelectCredential = useCallback((credential: RithmicCredentialSet) => {
    setCredentials({
      ...credential.credentials,
      password: credential.credentials.password,
      userId: user?.id || ''
    })
    setSelectedAccounts(credential.selectedAccounts)
    setAllAccounts(credential.allAccounts || false)
    setCurrentCredentialId(credential.id)
    setShouldSaveCredentials(true)
    setShowCredentialsManager(false)
    setShouldAutoConnect(true)
  }, [user?.id, setSelectedAccounts])

  const handleLoginWithSyncId = useCallback((syncId: string) => {
    if (isLegacyCredentialId(syncId)) {
      toast.error(t('rithmic.error.legacySyncIdTitle'), {
        description: t('rithmic.error.legacySyncIdDescription')
      })
      return
    }

    setCurrentCredentialId(syncId)
    setShowCredentialsManager(false)
    setStep('credentials')
    setSelectedAccounts([])
    setAvailableAccounts([])
    setAllAccounts(true)
    setAccountSearch('')
    setShouldSaveCredentials(true)
    setCredentials({
      username: '',
      password: '',
      server_type: 'Rithmic Paper Trading',
      location: 'Chicago Area',
      userId: user?.id || ''
    })
  }, [
    isLegacyCredentialId,
    t,
    user?.id,
    setSelectedAccounts,
    setAvailableAccounts,
    setStep,
    setAllAccounts,
    setAccountSearch,
    setShowCredentialsManager,
    setShouldSaveCredentials
  ])

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
  }, [user?.id, setSelectedAccounts])

  // Update the saveCredentialsAndAccounts function to merge duplicate usernames into one credential set
  const saveCredentialsAndAccounts = useCallback(() => {
    if (shouldSaveCredentials) {
      const allData = getAllRithmicData()
      
      // Find all credentials with the same username
      const existingCredentials = Object.values(allData).filter(
        cred => cred.credentials.username === credentials.username
      )

      // If we found existing credentials, merge them
      if (existingCredentials.length > 0) {
        // Merge all selected accounts and remove duplicates
        const mergedSelectedAccounts = Array.from(new Set([
          ...selectedAccounts,
          ...existingCredentials.flatMap(cred => cred.selectedAccounts)
        ]))

        // Use the most recent sync time
        const mostRecentSync = Math.max(
          ...existingCredentials.map(cred => new Date(cred.lastSyncTime).getTime()),
          Date.now()
        )

        // Use the most recent allAccounts setting
        const mergedAllAccounts = allAccounts || existingCredentials.some(cred => cred.allAccounts)

        const dataToSave = {
          id: existingCredentials[0].id, // Use the ID of the first existing credential
          credentials: {
            username: credentials.username,
            password: credentials.password,
            server_type: credentials.server_type,
            location: credentials.location
          },
          selectedAccounts: mergedSelectedAccounts,
          lastSyncTime: new Date(mostRecentSync).toISOString(),
          allAccounts: mergedAllAccounts
        }

        // Delete all other credentials with the same username
        existingCredentials.forEach(cred => {
          if (cred.id !== dataToSave.id) {
            clearRithmicData(cred.id)
          }
        })

        // Save the merged credential
        saveRithmicData(dataToSave)
        setCurrentCredentialId(dataToSave.id)

        // Show toast notification
        toast.success(t('rithmic.credentials.merged'), {
          description: t('rithmic.credentials.mergedDescription'),
        })
      } else {
        // No existing credentials found, save as new
        // Use username as the ID to match synchronization system
        const dataToSave = {
          id: currentCredentialId || generateCredentialId(credentials.username),
          credentials: {
            username: credentials.username,
            password: credentials.password,
            server_type: credentials.server_type,
            location: credentials.location
          },
          selectedAccounts,
          lastSyncTime: new Date().toISOString(),
          allAccounts
        }

        saveRithmicData(dataToSave)
        setCurrentCredentialId(dataToSave.id)
      }
    }
  }, [credentials, selectedAccounts, shouldSaveCredentials, currentCredentialId, allAccounts, t])

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
  }, [resetProcessingState, user?.id, setToken, setWsUrl, setStep])

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

  // Update useEffect to use context's fetchServerConfigs
  useEffect(() => {
    fetchServerConfigs()
  }, [fetchServerConfigs])

  // Update effect to use context step
  useEffect(() => {
    if (isConnected && selectedAccounts.length > 0) {
      console.log('Active connection detected, resuming processing view')
      setStep('processing')
    }
  }, [isConnected, selectedAccounts, setStep])

  const handleStartProcessing = useCallback(async () => {
    setIsLoading(true)
    setStep('processing')

    if (!token || !wsUrl) {
      setIsLoading(false)
      return
    }

    // Save credentials and accounts locally
    saveCredentialsAndAccounts()
    // Store synchronization data in db
    try {
      await setRithmicSynchronization({
        service: 'rithmic',
        accountId: credentials.username || '',
        token: token,
        tokenExpiresAt: null
      })
    } catch (error) {
      console.error('Failed to save synchronization data:', error)
      toast.error(t('rithmic.error.syncDataSaveFailed'), {
        description: t('rithmic.error.syncDataSaveFailedDescription'),
      })
    }

    // Use all available accounts if allAccounts is true
    const accountsToSync = allAccounts ? availableAccounts.map(acc => acc.account_id) : selectedAccounts
    const startDate = calculateStartDate(accountsToSync)
    console.log('Connecting to WebSocket:', wsUrl)
    connect(wsUrl, token, accountsToSync, startDate)
  }, [
    token,
    wsUrl,
    currentCredentialId,
    allAccounts,
    availableAccounts,
    selectedAccounts,
    saveCredentialsAndAccounts,
    calculateStartDate,
    connect,
    setStep
  ])

  return (
    <div className="space-y-6">
      {step === 'processing' && (
        <div className="flex items-center gap-2 p-3 mb-2 rounded-md bg-muted/60 border border-primary/20">
          <Loader2 className="animate-spin h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">
            {t('rithmic.processingBanner')}
          </span>
        </div>
      )}
      {(showCredentialsManager && (step === 'credentials' || step === 'processing')) ? (

        <RithmicCredentialsManager
          onSelectCredential={handleSelectCredential}
          onLoginMissingCredential={handleLoginWithSyncId}
          onAddNew={() => {
            setShowCredentialsManager(false)
            setSelectedAccounts([])
            setAvailableAccounts([])
            setAllAccounts(true)
            setAccountSearch('')
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sync-all"
                      checked={allAccounts}
                      onCheckedChange={(checked) => {
                        setAllAccounts(checked)
                        if (checked) {
                          setSelectedAccounts([])
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <Label 
                        htmlFor="sync-all"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t('rithmic.syncAllAccounts')}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {t('rithmic.syncAllAccountsDescription')}
                      </span>
                    </div>
                  </div>
                </div>

                {!allAccounts && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder={t('rithmic.searchAccounts')}
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAccountSearch('')}
                      >
                        {t('common.clear')}
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2 p-2 rounded bg-accent/50">
                      <Checkbox
                        id="select-all"
                        checked={selectedAccounts.length === filteredAccounts.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAccounts(filteredAccounts.map(acc => acc.account_id))
                          } else {
                            setSelectedAccounts([])
                          }
                        }}
                      />
                      <Label 
                        htmlFor="select-all"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t('rithmic.selectAllAccounts')}
                      </Label>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {filteredAccounts.map((account) => (
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
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('credentials')
                    setSelectedAccounts([])
                    setAvailableAccounts([])
                    setAllAccounts(true)
                    setAccountSearch('')
                  }}
                  disabled={isLoading}
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleStartProcessing}
                  disabled={isLoading || (!allAccounts && selectedAccounts.length === 0)}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {allAccounts 
                    ? t('rithmic.startProcessing.all')
                    : selectedAccounts.length === 1 
                      ? t('rithmic.startProcessing.one', { count: 1 })
                      : t('rithmic.startProcessing.other', { count: selectedAccounts.length })
                  }
                </Button>
              </div>
            </div>
          )}
{/* 
          {step === 'processing' && (
            <div className="space-y-4">
              <RithmicSyncFeedback 
                totalAccounts={allAccounts ? availableAccounts.length : selectedAccounts.length}
              />
            </div>
          )} */}
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
      <RithmicSyncConnection 
        setIsOpen={setIsOpen}
      />
      <div className="mt-6 text-xs text-muted-foreground space-y-2 border-t pt-4">
        <div className="flex items-center gap-4 mb-2">
          <Image 
            src="/logos/TradingPlatformByRithmic-Black.png"
            alt="Trading Platform by Rithmic"
            width={120}
            height={40}
            className="dark:hidden"
          />
          <Image 
            src="/logos/TradingPlatformByRithmic-Green.png"
            alt="Trading Platform by Rithmic"
            width={120}
            height={40}
            className="hidden dark:block"
          />
          <Image 
            src="/logos/Powered_by_Omne.png"
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


