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
import { initiateTradovateOAuth, handleTradovateCallback, refreshTradovateToken, getTradovateAccounts, getTradovateTrades, testTradovateAuth } from './actions'
import { TradovateDebug } from './debug-tradovate'



export function TradovateSync({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()
  const tradovateStore = useTradovateSyncStore()
  const t = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Reset video state
    video.pause()
    video.currentTime = 0

    // Play video when component mounts
    const playVideo = () => {
      video.play().catch((error) => {
        console.error('Video playback error:', error)
      })
    }

    // Play video when it's ready
    if (video.readyState >= 2) {
      playVideo()
    } else {
      video.addEventListener('loadeddata', playVideo, { once: true })
    }

    // Cleanup
    return () => {
      if (video) {
        video.pause()
        video.removeEventListener('loadeddata', () => {})
      }
    }
  }, [])

  // Check for existing tokens on mount and auto-refresh if needed
  useEffect(() => {
    if (tradovateStore.isAuthenticated) {
      if (tradovateStore.isTokenExpired() && tradovateStore.refreshToken) {
        // Try to refresh token
        handleRefreshToken()
      } else if (tradovateStore.accessToken) {
        // Load accounts if we have a valid token
        loadAccounts(tradovateStore.accessToken)
      }
    }
  }, [tradovateStore.isAuthenticated])

  // OAuth callback is now handled by the dedicated /dashboard/import page

  const handleStartOAuth = async () => {
    try {
      setIsLoading(true)
      const result = await initiateTradovateOAuth(tradovateStore.environment)
      if (result.error || !result.authUrl || !result.state) {
        toast({
          title: "Error",
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
        title: "Error",
        description: t('tradovateSync.error.oauthInit'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // handleOAuthCallback has been moved to the dedicated /dashboard/import callback page

  const handleRefreshToken = async () => {
    if (!tradovateStore.refreshToken) return

    try {
      const result = await refreshTradovateToken(tradovateStore.refreshToken, tradovateStore.environment)
      if (result.error || !result.accessToken || !result.refreshToken || !result.expiresAt) {
        // Refresh failed, need to re-authenticate
        tradovateStore.clearAll()
        return
      }

      // Update tokens in store
      tradovateStore.setTokens(
        result.accessToken,
        result.refreshToken,
        new Date(result.expiresAt).getTime()
      )
    } catch (error) {
      console.error('Token refresh failed:', error)
      tradovateStore.clearAll()
    }
  }

  const loadAccounts = async (accessToken: string) => {
    try {
      // First test authentication with /me endpoint
      console.log('Testing authentication before loading accounts...')
      const authTest = await testTradovateAuth(accessToken, tradovateStore.environment)
      
      if (!authTest.success) {
        console.error('Authentication test failed:', authTest.error)
        toast({
          title: "Warning",
          description: `Authentication failed: ${authTest.error}`,
          variant: "destructive",
        })
        return
      }
      
      console.log('Authentication test passed, now fetching accounts...')
      const accounts = await getTradovateAccounts(accessToken, tradovateStore.environment)
      if (accounts.error || !accounts.accounts) {
        toast({
          title: "Warning",
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
    if (!accessToken || !tradovateStore.accounts) return

    try {
      setIsSyncing(true)
      let totalTradesSaved = 0
      let totalFillsProcessed = 0
      
      // Sync trades for all accounts
      for (const account of tradovateStore.accounts) {
        console.log(`Syncing trades for account: ${account.name} (${account.id})`)
        
        const result = await getTradovateTrades(accessToken, account.id, tradovateStore.environment)
        
        if (result.error) {
          toast({
            title: "Warning",
            description: t('tradovateSync.error.syncTrades', { account: account.name }) + `: ${result.error}`,
            variant: "destructive",
          })
          continue
        }

        // Track progress
        const fillsCount = result.trades?.length || 0
        const savedCount = result.savedCount || 0
        
        totalFillsProcessed += fillsCount
        totalTradesSaved += savedCount
        
        console.log(`Account ${account.name}: ${fillsCount} fills → ${savedCount} trades saved`)
        
        // Show progress for each account
        if (fillsCount > 0) {
          toast({
            title: `${account.name}`,
            description: `Found ${fillsCount} fills, saved ${savedCount} new trades`,
            variant: savedCount > 0 ? "default" : "secondary",
          })
        }
      }

      // Update last sync time
      tradovateStore.updateLastSync()

      // Show final summary
      if (totalTradesSaved > 0) {
        toast({
          title: "✅ Sync Complete",
          description: `Processed ${totalFillsProcessed} fills and saved ${totalTradesSaved} new trades`,
        })
      } else if (totalFillsProcessed > 0) {
        toast({
          title: "🔄 Sync Complete",
          description: `Processed ${totalFillsProcessed} fills (no new trades - likely duplicates)`,
          variant: "secondary"
        })
      } else {
        toast({
          title: "📭 Sync Complete",
          description: "No new fills found in the last 30 days",
          variant: "secondary"
        })
      }
    } catch (error) {
      console.error('Trade sync error:', error)
      toast({
        title: "Error",
        description: `Trade sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCopyToken = () => {
    const accessToken = tradovateStore.getValidToken()
    if (!accessToken) return
    navigator.clipboard.writeText(accessToken)
    toast({
      title: "Success",
      description: t('tradovateSync.copied'),
    })
  }

  const handleDisconnect = () => {
    tradovateStore.clearAll()
    toast({
      title: "Success",
      description: t('tradovateSync.disconnected'),
    })
  }

  const getMaskedToken = () => {
    const accessToken = tradovateStore.getValidToken()
    if (!accessToken) return ''
    return '•'.repeat(accessToken.length)
  }

  return (
    <div className="flex flex-col space-y-4 p-6">
      {/* Temporary debug component - remove this once OAuth is working */}
      <TradovateDebug />
      
      <div className="border-t pt-6"></div>
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('tradovateSync.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('tradovateSync.description')}
        </p>
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
        <div className="text-xs space-y-1">
          {tradovateStore.environment === 'live' && (
            <p className="text-amber-600 dark:text-amber-400">
              ⚠️ {t('tradovateSync.liveWarning')}
            </p>
          )}
          <p className="text-blue-600 dark:text-blue-400">
            💡 <strong>ApexTraderFunding users:</strong> Use Demo for sim accounts, Live for funded accounts
          </p>
          <p className="text-muted-foreground">
            Note: Authentication always uses live.tradovateapi.com regardless of environment
          </p>
        </div>
      </div>

      {!tradovateStore.isAuthenticated ? (
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
          
          {/* Debug info for account loading */}
          {tradovateStore.isAuthenticated && (
            <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
              <p><strong>Debug Info:</strong></p>
              <p>• Authenticated: ✅</p>
              <p>• Organization: ApexTraderFunding (Prop Firm)</p>
              <p>• Environment: {tradovateStore.environment} (accounts), live (auth)</p>
              <p>• Accounts loaded: {tradovateStore.accounts ? `✅ (${tradovateStore.accounts.length})` : '❌'}</p>
              <p>• Accounts data: {JSON.stringify(tradovateStore.accounts)}</p>
              {(!tradovateStore.accounts || tradovateStore.accounts.length === 0) && (
                <div className="text-amber-600 mt-1">
                  <p>⚠️ No accounts found - trying multiple sim account endpoints...</p>
                  <p>💡 Check console logs to see which endpoint works for your prop firm</p>
                  {tradovateStore.environment === 'live' && (
                    <p className="text-blue-600 mt-1">
                      🔄 For ApexTraderFunding: Try switching to Demo environment and reconnecting
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>{t('tradovateSync.notice')}</p>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-2xl font-bold">{t('tradovateSync.tutorial.title')}</h2>
        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 transition-transform duration-300 hover:scale-[1.02]">
          <video
            ref={videoRef}
            height="600"
            width="600"
            preload="metadata"
            loop
            muted
            controls
            playsInline
            className="rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg w-full h-full object-cover"
          >
            <source src="/videos/tradovate-sync-tutorial.mp4" type="video/mp4" />
            <track
              src="/path/to/captions.vtt"
              kind="subtitles"
              srcLang="en"
              label="English"
            />
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('tradovateSync.tutorial.description')}
        </p>
      </div>
    </div>
  )
} 