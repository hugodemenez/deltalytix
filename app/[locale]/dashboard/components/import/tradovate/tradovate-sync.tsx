'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CopyIcon, RefreshCwIcon, EyeIcon, ExternalLinkIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useI18n } from "@/locales/client"
import { useTradovateSyncStore } from "@/store/tradovate-sync-store"
import { initiateTradovateOAuth, handleTradovateCallback, refreshTradovateToken, renewTradovateAccessToken, getTradovateAccounts, getTradovateTrades, testTradovateAuth, getTradovateToken, getAllTradovateTokens, setCustomTradovateToken } from './actions'
import { TradovateDebug } from './debug-tradovate'
import { useData } from "@/context/data-provider"
import { useTradovateTokenManager } from "@/hooks/use-tradovate-token-manager"


export function TradovateSync({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [authMode, setAuthMode] = useState<'oauth' | 'custom'>('oauth')
  const [customToken, setCustomToken] = useState('')
  const [customAccountName, setCustomAccountName] = useState('')
  const [savedTokens, setSavedTokens] = useState<any[]>([])
  const [selectedToken, setSelectedToken] = useState<string>('')
  const { toast } = useToast()
  const tradovateStore = useTradovateSyncStore()
  const t = useI18n()
  const { 
    startTokenRenewal, 
    stopTokenRenewal, 
    isRenewalActive, 
    tokenStatus 
  } = useTradovateTokenManager()

  const { refreshTrades } = useData()

  // Load saved tokens
  const loadSavedTokens = async () => {
    try {
      const result = await getAllTradovateTokens()
      if (!result.error && result.tokens) {
        setSavedTokens(result.tokens)
      }
    } catch (error) {
      console.warn('Failed to load saved tokens:', error)
    }
  }

  // Check for existing tokens on mount and auto-refresh if needed
  useEffect(() => {
    const loadTokensFromDatabase = async () => {
      try {
        // Try to load tokens from database using server action
        const tokenResult = await getTradovateToken()
        if (!tokenResult.error) {
          // Update store with database tokens
          tradovateStore.setTokens(
            tokenResult.accessToken!,
            tradovateStore.refreshToken || '', // Keep existing refresh token
            tokenResult.expiresAt!
          )
          tradovateStore.setAuthenticated(true)
          
          // Load accounts with the token
          loadAccounts(tokenResult.accessToken!)
          return
        }
      } catch (error) {
        console.warn('Failed to load tokens from database:', error)
      }
      
      // Fallback to existing store logic
      if (tradovateStore.isAuthenticated) {
        if (tradovateStore.isTokenExpired() && tradovateStore.refreshToken) {
          // Try to refresh token
          handleRefreshToken()
        } else if (tradovateStore.accessToken) {
          // Load accounts if we have a valid token
          loadAccounts(tradovateStore.accessToken)
        }
      }
    }

    loadTokensFromDatabase()
  }, [tradovateStore.isAuthenticated])

  // Load saved tokens when switching to custom mode
  useEffect(() => {
    if (authMode === 'custom') {
      loadSavedTokens()
    }
  }, [authMode])

  // Start token renewal when authenticated
  useEffect(() => {
    if (tradovateStore.isAuthenticated && tradovateStore.accessToken) {
      // Store tokens in sessionStorage for the worker
      sessionStorage.setItem('tradovate_access_token', tradovateStore.accessToken);
      sessionStorage.setItem('tradovate_token_expiration', tradovateStore.expiresAt!);
      sessionStorage.setItem('tradovate_environment', tradovateStore.environment);
      
      // Start automatic token renewal
      startTokenRenewal(tradovateStore.environment);
    } else {
      // Stop token renewal when not authenticated
      stopTokenRenewal();
    }
  }, [tradovateStore.isAuthenticated, tradovateStore.environment, startTokenRenewal, stopTokenRenewal])

  // OAuth callback is now handled by the dedicated /dashboard/import page

  const handleStartOAuth = async () => {
    try {
      setIsLoading(true)
      const result = await initiateTradovateOAuth()
      if (result.error || !result.authUrl || !result.state) {
        toast({
          title: t('tradovateSync.sync.error'),
          description: t('tradovateSync.error.oauthInit'),
          variant: "destructive",
        })
        return
      }
      
      // Store the state for verification
      tradovateStore.setOAuthState(result.state)
      
      // Redirect to Tradovate OAuth
      window.location.href = result.authUrl
    } catch (error) {
      toast({
        title: t('tradovateSync.sync.error'),
        description: t('tradovateSync.error.oauthInit'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // handleOAuthCallback has been moved to the dedicated /dashboard/import callback page

  const handleRefreshToken = async () => {
    if (!tradovateStore.accessToken) return

    try {
      const result = await renewTradovateAccessToken(tradovateStore.accessToken, tradovateStore.environment)
      if (result.error || !result.accessToken || !result.expiresAt) {
        // Renewal failed, need to re-authenticate
        tradovateStore.clearAll()
        return
      }

      // Update tokens in store
      tradovateStore.setTokens(
        result.accessToken,
        tradovateStore.refreshToken || '', // Keep existing refresh token
        result.expiresAt
      )

      // Update sessionStorage for the worker
      sessionStorage.setItem('tradovate_access_token', result.accessToken);
      sessionStorage.setItem('tradovate_token_expiration', result.expiresAt);
    } catch (error) {
      console.error('Token renewal failed:', error)
      tradovateStore.clearAll()
    }
  }

  const loadAccounts = async (accessToken: string) => {
    try {
      // First test authentication with /me endpoint
      console.log('Testing authentication before loading accounts...')
      const authTest = await testTradovateAuth(accessToken)
      
      if (!authTest.success) {
        console.error('Authentication test failed:', authTest.error)
        toast({
          title: t('tradovateSync.sync.warning'),
          description: t('tradovateSync.sync.authFailed', { error: authTest.error }),
          variant: "destructive",
        })
        return
      }
      
      console.log('Authentication test passed, now fetching accounts...')
      const accounts = await getTradovateAccounts(accessToken)
      if (accounts.error || !accounts.accounts) {
        toast({
          title: t('tradovateSync.sync.warning'),
          description: t('tradovateSync.error.loadAccounts'),
          variant: "destructive",
        })
        return
      }

      tradovateStore.setAccounts(accounts.accounts)
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const handleSyncTrades = async () => {
    const accessToken = tradovateStore.getValidToken()
    if (!accessToken) return

    try {
      setIsSyncing(true)
      
      // Sync all trades (no need to loop through accounts since we get all fillpairs)
      console.log('Syncing all trades from fillpairs...')
      
      const result = await getTradovateTrades(accessToken)
      
      if (result.error) {
        toast({
          title: t('tradovateSync.sync.warning'),
          description: t('tradovateSync.error.syncTrades', { account: 'all accounts' }) + `: ${result.error}`,
          variant: "destructive",
        })
        return
      }

      // Track progress
      const savedCount = result.savedCount || 0
      const ordersCount = result.ordersCount || 0
      
      console.log(`Sync complete: ${savedCount} trades saved, ${ordersCount} orders processed`)

      // Update last sync time
      tradovateStore.updateLastSync()

      // Show final summary
      if (savedCount > 0) {
        toast({
          title: t('tradovateSync.sync.syncComplete'),
          description: t('tradovateSync.sync.syncCompleteWithTrades', { totalOrdersProcessed: ordersCount, totalTradesSaved: savedCount }),
        })
      } else if (ordersCount > 0) {
        toast({
          title: t('tradovateSync.sync.syncCompleteNoNewTrades'),
          description: t('tradovateSync.sync.syncCompleteNoNewTradesDesc', { totalOrdersProcessed: ordersCount }),
          variant: "default"
        })
      } else {
        toast({
          title: t('tradovateSync.sync.syncCompleteNoOrders'),
          description: t('tradovateSync.sync.syncCompleteNoOrdersDesc'),
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Trade sync error:', error)
      toast({
        title: t('tradovateSync.sync.error'),
        description: t('tradovateSync.sync.syncFailed', { error: error instanceof Error ? error.message : t('tradovateSync.sync.unknownError') }),
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
      await refreshTrades()
    }
  }

  const handleSaveCustomToken = async () => {
    if (!customToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter a custom token.",
        variant: "destructive",
      })
      return
    }

    if (!customAccountName.trim()) {
      toast({
        title: "Account Name Required", 
        description: "Please enter an account name for this token.",
        variant: "destructive",
      })
      return
    }

    try {
      // Set expiration to 15 minutes from now
      const expirationDate = new Date(Date.now() + 15 * 60 * 1000)
      
      const result = await setCustomTradovateToken(
        customToken.trim(),
        expirationDate.toISOString(),
        customAccountName.trim(),
        'demo' // Default to demo environment
      )

      if ('error' in result) {
        toast({
          title: "Save Failed",
          description: `Failed to save custom token: ${result.error}`,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Token Saved",
        description: `Custom token saved for account: ${customAccountName}`,
      })

      // Clear the form
      setCustomToken('')
      setCustomAccountName('')
      
      // Reload saved tokens
      await loadSavedTokens()
    } catch (error) {
      console.error('Save custom token error:', error)
      toast({
        title: "Save Error",
        description: `Failed to save custom token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    }
  }

  const handleSyncTradesWithCustomTokens = async () => {
    let tokenToUse = ''
    
    // Use selected saved token if available, otherwise use form token
    if (selectedToken) {
      const selectedTokenData = savedTokens.find(token => token.accountId === selectedToken)
      if (selectedTokenData && selectedTokenData.token) {
        tokenToUse = selectedTokenData.token
      }
    } else if (customToken.trim()) {
      tokenToUse = customToken.trim()
    }
    
    if (!tokenToUse) {
      toast({
        title: "Token Required",
        description: "Please select a saved token or enter a custom token first.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSyncing(true)
      
      const accountName = selectedToken ? 
        savedTokens.find(token => token.accountId === selectedToken)?.accountId || 'saved' :
        customAccountName || 'custom'
      
      console.log(`Syncing trades using custom token for account: ${accountName}`)
      
      const result = await getTradovateTrades(tokenToUse)
      
      if (result.error) {
        toast({
          title: "Sync Failed",
          description: `Failed to sync trades: ${result.error}`,
          variant: "destructive",
        })
        return
      }

      // Track progress
      const savedCount = result.savedCount || 0
      const ordersCount = result.ordersCount || 0
      
      console.log(`Custom token sync complete: ${savedCount} trades saved, ${ordersCount} orders processed`)

      // Show final summary
      if (savedCount > 0) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${savedCount} trades from ${ordersCount} orders using custom token.`,
        })
      } else if (ordersCount > 0) {
        toast({
          title: "Sync Complete - No New Trades",
          description: `Processed ${ordersCount} orders but no new trades were found.`,
          variant: "default"
        })
      } else {
        toast({
          title: "Sync Complete - No Orders",
          description: "No orders found to process.",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Custom token sync error:', error)
      toast({
        title: "Sync Error",
        description: `Failed to sync trades: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
      await refreshTrades()
    }
  }

  const handleCopyToken = () => {
    const accessToken = tradovateStore.getValidToken()
    if (!accessToken) return
    navigator.clipboard.writeText(accessToken)
    toast({
      title: t('tradovateSync.sync.success'),
      description: t('tradovateSync.copied'),
    })
  }

  const handleDisconnect = () => {
    tradovateStore.clearAll()
    toast({
      title: t('tradovateSync.sync.success'),
      description: t('tradovateSync.disconnected'),
    })
  }

  const getMaskedToken = () => {
    const accessToken = tradovateStore.getValidToken()
    if (!accessToken) return ''
    return '•'.repeat(accessToken.length)
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('tradovateSync.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('tradovateSync.description')}
        </p>
      </div>

      {/* Authentication Mode Toggle */}
      <div className="space-y-2">
        <Label>Authentication Method</Label>
        <Select value={authMode} onValueChange={(value: 'oauth' | 'custom') => setAuthMode(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oauth">OAuth (Recommended)</SelectItem>
            <SelectItem value="custom">Custom Token</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="environment">{t('tradovateSync.environment')}</Label>
        <Select
          value={tradovateStore.environment}
          onValueChange={(value: 'demo' | 'live') => tradovateStore.setEnvironment(value)}
          disabled={tradovateStore.isAuthenticated}
        >
          <SelectTrigger id="environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="demo">
              <div className="flex flex-col">
                <span>{t('tradovateSync.environments.demo')}</span>
                <span className="text-xs text-muted-foreground">demo.tradovateapi.com</span>
              </div>
            </SelectItem>
            <SelectItem value="live">
              <div className="flex flex-col">
                <span>{t('tradovateSync.environments.live')}</span>
                <span className="text-xs text-muted-foreground">live.tradovateapi.com</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {authMode === 'oauth' ? (
        !tradovateStore.isAuthenticated ? (
          <div className="space-y-4">
            <Button
              onClick={handleStartOAuth}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              {t('tradovateSync.connectAccount')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('tradovateSync.oauthNotice')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2">
              {isLoading ? (
                <Skeleton className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
              ) : (
                <Input
                  value={isRevealed ? (tradovateStore.getValidToken() || '') : getMaskedToken()}
                  readOnly
                  placeholder={t('tradovateSync.noToken')}
                  className="font-mono"
                />
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!tradovateStore.getValidToken() || isLoading}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('tradovateSync.revealToken')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('tradovateSync.revealWarning')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsRevealed(false)}>{t('tradovateSync.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setIsRevealed(true)}>{t('tradovateSync.reveal')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyToken}
                disabled={!tradovateStore.getValidToken() || isLoading}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {t('tradovateSync.disconnect')}
              </Button>
            </div>

            {tradovateStore.accounts && tradovateStore.accounts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('tradovateSync.accounts')}</h3>
                <div className="space-y-1">
                  {tradovateStore.accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-sm">
                        {account.nickname || account.name} ({account.id})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {account.accountType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleSyncTrades}
              disabled={isSyncing || !tradovateStore.accounts || tradovateStore.accounts.length === 0}
              className="w-full"
            >
              {isSyncing && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
              {t('tradovateSync.syncTrades')}
            </Button>
            
            {/* Token Status and Debug info */}
            {tradovateStore.isAuthenticated && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded space-y-2">
                <div>
                  <p><strong>Token Status:</strong></p>
                  <p>• Auto-renewal: {isRenewalActive ? '✅ Active' : '❌ Inactive'}</p>
                  <p>• Token valid: {tokenStatus.isValid ? '✅ Yes' : '❌ No'}</p>
                  {tokenStatus.expiresIn && (
                    <p>• Expires in: {tokenStatus.expiresIn} minutes</p>
                  )}
                  {tokenStatus.expirationTime && (
                    <p>• Expires at: {new Date(tokenStatus.expirationTime).toLocaleString()}</p>
                  )}
                </div>
                
                <div className="border-t pt-2">
                  <p><strong>{t('tradovateSync.sync.debugInfo')}</strong></p>
                  <p>• {t('tradovateSync.sync.authenticated')}</p>
                  <p>• {t('tradovateSync.sync.organization')}</p>
                  <p>• {t('tradovateSync.sync.environment', { environment: tradovateStore.environment })}</p>
                  <p>• {t('tradovateSync.sync.accountsLoaded', { status: tradovateStore.accounts ? `✅ (${tradovateStore.accounts.length})` : '❌' })}</p>
                  {(!tradovateStore.accounts || tradovateStore.accounts.length === 0) && (
                    <div className="text-amber-600 mt-1">
                      <p>{t('tradovateSync.sync.noAccountsWarning')}</p>
                      <p>{t('tradovateSync.sync.checkConsoleLogs')}</p>
                      {tradovateStore.environment === 'live' && (
                          <p className="text-blue-600 mt-1">
                            {t('tradovateSync.sync.apexTraderFundingTip')}
                          </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* Saved Tokens Section */}
          {savedTokens.length > 0 && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Saved Tokens</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a saved token to use for syncing.
              </p>
              
              <div className="space-y-2">
                {savedTokens.map((token) => (
                  <div key={token.accountId} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`token-${token.accountId}`}
                        name="selectedToken"
                        value={token.accountId}
                        checked={selectedToken === token.accountId}
                        onChange={(e) => setSelectedToken(e.target.value)}
                        className="mr-2"
                      />
                      <label htmlFor={`token-${token.accountId}`} className="text-sm">
                        <span className="font-medium">{token.accountId}</span>
                        <span className="text-muted-foreground ml-2">
                          {token.isExpired ? '(Expired)' : '(Valid)'}
                        </span>
                      </label>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expires: {new Date(token.tokenExpiresAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Button
                  onClick={handleSyncTradesWithCustomTokens}
                  disabled={isSyncing || !selectedToken}
                  className="w-full"
                >
                  {isSyncing && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
                  Sync Trades with Selected Token
                </Button>
              </div>
            </div>
          )}
          
          {/* Add New Token Section */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">Add New Token</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your custom Tradovate access token and account name below.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customToken">Access Token</Label>
                <Input
                  id="customToken"
                  type="password"
                  placeholder="Enter your Tradovate access token"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customAccountName">Account Name</Label>
                <Input
                  id="customAccountName"
                  type="text"
                  placeholder="Enter account name (e.g., My Demo Account)"
                  value={customAccountName}
                  onChange={(e) => setCustomAccountName(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveCustomToken}
                  disabled={!customToken.trim() || !customAccountName.trim()}
                  variant="outline"
                  className="flex-1"
                >
                  Save Token
                </Button>
                
                <Button
                  onClick={handleSyncTradesWithCustomTokens}
                  disabled={isSyncing || !customToken.trim()}
                  className="flex-1"
                >
                  {isSyncing && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
                  Sync Trades
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="text-sm text-muted-foreground">
        <p>{t('tradovateSync.notice')}</p>
      </div>

    </div>
  )
} 