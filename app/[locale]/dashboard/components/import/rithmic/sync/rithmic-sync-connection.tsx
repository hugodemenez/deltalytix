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
import { useRithmicSyncStore } from '@/store/rithmic-sync-store'
import { saveRithmicData, getRithmicData, clearRithmicData, generateCredentialId, getAllRithmicData, RithmicCredentialSet } from '@/lib/rithmic-storage'
import { RithmicCredentialsManager } from './rithmic-credentials-manager'
import { useI18n } from '@/locales/client'
import { ThemeAwareLogo } from '@/components/monochrome-logo'
import { useUserStore } from '@/store/user-store'
import { setRithmicSynchronization } from './actions'
import { useRithmicSyncContext } from '@/context/rithmic-sync-context'
import { captureConnectionCreated } from '@/lib/connection-analytics'
import { cn } from '@/lib/utils'

const fieldClassName =
  'h-11 rounded-sm border-black/10 bg-transparent text-sm shadow-none focus-visible:border-black/30 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:focus-visible:border-white/30'

const configSelectClassName =
  'h-8 w-auto min-w-0 max-w-full gap-1 rounded-sm border-black/10 bg-transparent px-2 text-xs shadow-none focus:ring-0 focus:ring-offset-0 dark:border-white/10 [&>span]:truncate'

const selectContentClassName =
  'rounded-sm border-black/10 bg-white shadow-none dark:border-white/10 dark:bg-black'

const primaryButtonClassName =
  'h-11 w-full rounded-sm bg-[oklch(0.22_0.01_95)] text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]'

const secondaryButtonClassName =
  'h-9 rounded-sm border border-black/20 bg-transparent px-3 text-sm font-medium shadow-none transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5'

interface RithmicCredentials {
  username: string
  password: string
  server_type: string
  location: string
  userId: string
}

interface RithmicSyncConnectionProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>> | ((open: boolean) => void)
  /** When false, open on the credentials form instead of the saved-credentials list. */
  initialShowCredentialsManager?: boolean
}

export function RithmicSyncConnection({
  setIsOpen,
  initialShowCredentialsManager = true,
}: RithmicSyncConnectionProps) {
  const user = useUserStore(state => state.user)
  const { 
    connect, 
    disconnect, 
    isConnected, 
    handleMessage,
    authenticateAndGetAccounts,
    calculateStartDate
  } = useRithmicSyncContext()
  
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
  const [showCredentialsManager, setShowCredentialsManager] = useState(
    initialShowCredentialsManager
  )
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
    setShowCredentialsManager(initialShowCredentialsManager)
    setCredentials({
      username: '',
      password: '',
      server_type: 'Rithmic Paper Trading',
      location: 'Chicago Area',
      userId: user?.id || ''
    })
  }, [
    resetProcessingState,
    user?.id,
    setToken,
    setWsUrl,
    setStep,
    initialShowCredentialsManager,
  ])

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
      captureConnectionCreated('rithmic')
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
        <div className="flex items-center gap-2 border-y border-black/10 py-3 text-sm text-black/55 dark:border-white/10 dark:text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('rithmic.processingBanner')}</span>
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
            <form onSubmit={(e) => handleConnect(e, false)} className="space-y-5" autoComplete="on">
              {(initialShowCredentialsManager || currentCredentialId) && (
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-normal tracking-tight md:text-2xl">
                    {currentCredentialId
                      ? t('rithmic.editCredentials')
                      : t('rithmic.addNewCredentials')}
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCredentialsManager(true)}
                    className={cn(secondaryButtonClassName, 'shrink-0')}
                  >
                    {t('rithmic.backToList')}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/10 pb-3 dark:border-white/10">
                <div className="flex min-w-0 items-center gap-2">
                  <Label
                    htmlFor="server-type"
                    className="shrink-0 text-xs text-black/45 dark:text-white/45"
                  >
                    {t('rithmic.serverTypeLabel')}
                  </Label>
                  <Select
                    name="server-type"
                    value={credentials.server_type}
                    onValueChange={(value) => {
                      setCredentials((prev) => ({
                        ...prev,
                        server_type: value,
                        location: '',
                      }))
                    }}
                  >
                    <SelectTrigger id="server-type" className={configSelectClassName}>
                      <SelectValue placeholder={t('rithmic.selectServerType')} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {Object.keys(serverConfigs).map((serverType) => (
                        <SelectItem key={serverType} value={serverType} className="rounded-sm text-xs">
                          {serverType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <Label
                    htmlFor="location"
                    className="shrink-0 text-xs text-black/45 dark:text-white/45"
                  >
                    {t('rithmic.locationLabel')}
                  </Label>
                  <Select
                    name="location"
                    value={credentials.location}
                    onValueChange={(value) =>
                      setCredentials((prev) => ({ ...prev, location: value }))
                    }
                    disabled={!credentials.server_type}
                  >
                    <SelectTrigger id="location" className={configSelectClassName}>
                      <SelectValue placeholder={t('rithmic.selectLocation')} />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      {credentials.server_type &&
                        serverConfigs[credentials.server_type]?.map((location) => (
                          <SelectItem key={location} value={location} className="rounded-sm text-xs">
                            {location}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rithmic-username" className="text-sm text-black/55 dark:text-white/55">
                  {t('rithmic.usernameLabel')}
                </Label>
                <Input 
                  id="rithmic-username" 
                  name="username"
                  autoComplete="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  spellCheck="false"
                  required
                  className={fieldClassName}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rithmic-password" className="text-sm text-black/55 dark:text-white/55">
                  {t('rithmic.passwordLabel')}
                </Label>
                <Input 
                  id="rithmic-password" 
                  name="password"
                  type="password" 
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className={fieldClassName}
                />
              </div>

              <div className="flex items-center gap-2 border-y border-black/10 py-3 dark:border-white/10">
                <Checkbox
                  id="save-credentials"
                  checked={shouldSaveCredentials}
                  onCheckedChange={(checked) => setShouldSaveCredentials(checked as boolean)}
                />
                <Label 
                  htmlFor="save-credentials"
                  className="cursor-pointer text-sm text-black/55 dark:text-white/55"
                >
                  {currentCredentialId ? t('rithmic.updateSavedCredentials') : t('rithmic.saveForNextLogin')}
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !credentials.server_type || !credentials.location} 
                className={primaryButtonClassName}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('rithmic.getAccounts')}
              </Button>
            </form>
          )}

          {step === 'select-accounts' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-normal tracking-tight md:text-2xl">
                  {t('rithmic.selectAccountsTitle')}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-black/55 dark:text-white/55">
                  {t('rithmic.selectAccountsDescription')}
                </p>
              </div>

              <div className="flex items-start gap-3 border-y border-black/10 py-4 dark:border-white/10">
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
                <div className="flex flex-col gap-0.5">
                  <Label 
                    htmlFor="sync-all"
                    className="cursor-pointer text-sm font-medium"
                  >
                    {t('rithmic.syncAllAccounts')}
                  </Label>
                  <span className="text-sm text-black/45 dark:text-white/45">
                    {t('rithmic.syncAllAccountsDescription')}
                  </span>
                </div>
              </div>

              {!allAccounts && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t('rithmic.searchAccounts')}
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className={cn(fieldClassName, 'flex-1')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAccountSearch('')}
                      className={secondaryButtonClassName}
                    >
                      {t('common.clear')}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 border-b border-black/10 pb-3 dark:border-white/10">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredAccounts.length > 0 &&
                        selectedAccounts.length === filteredAccounts.length
                      }
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
                      className="cursor-pointer text-sm font-medium"
                    >
                      {t('rithmic.selectAllAccounts')}
                    </Label>
                  </div>

                  <div className="max-h-[300px] divide-y divide-black/10 overflow-y-auto border-y border-black/10 dark:divide-white/10 dark:border-white/10">
                    {filteredAccounts.map((account) => (
                      <div
                        key={account.account_id}
                        className="flex items-center gap-3 py-3 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                      >
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
                          <span className="text-sm font-medium">{account.account_id}</span>
                          <span className="ml-2 text-sm text-black/45 dark:text-white/45">
                            {t('rithmic.fcmId')}: {account.fcm_id}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep('credentials')
                    setSelectedAccounts([])
                    setAvailableAccounts([])
                    setAllAccounts(true)
                    setAccountSearch('')
                  }}
                  disabled={isLoading}
                  className={secondaryButtonClassName}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  onClick={handleStartProcessing}
                  disabled={isLoading || (!allAccounts && selectedAccounts.length === 0)}
                  className={cn(primaryButtonClassName, 'flex-1')}
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
        </>
      )}
    </div>
  )
}

interface RithmicSyncWrapperProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>> | ((open: boolean) => void)
  /** When false, open on the credentials form instead of the saved-credentials list. */
  initialShowCredentialsManager?: boolean
}

export function RithmicSyncWrapper({
  setIsOpen,
  initialShowCredentialsManager = true,
}: RithmicSyncWrapperProps) {
  const t = useI18n()
  const showChromeTitle = initialShowCredentialsManager

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {showChromeTitle && (
          <h2 className="text-xl font-normal tracking-tight md:text-2xl">
            {t('import.type.rithmicLogin')}
          </h2>
        )}
        <RithmicSyncConnection 
          setIsOpen={setIsOpen}
          initialShowCredentialsManager={initialShowCredentialsManager}
        />
      </div>
      <div className="shrink-0 space-y-2 border-t border-black/10 pt-4 text-xs leading-relaxed text-black/45 dark:border-white/10 dark:text-white/45">
        <div className="mb-2 flex items-center gap-4">
          <ThemeAwareLogo
            path="/logos/monochrome/trading-platform-by-rithmic-black.png"
            darkPath="/logos/monochrome/trading-platform-by-rithmic-white.png"
            alt="Trading Platform by Rithmic"
            width={164}
            height={35}
            className="h-7 w-auto"
          />
          <ThemeAwareLogo
            path="/logos/monochrome/powered-by-omne-black.png"
            darkPath="/logos/monochrome/powered-by-omne-white.png"
            alt="Powered by OMNE"
            width={141}
            height={15}
            className="h-3.5 w-auto"
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
