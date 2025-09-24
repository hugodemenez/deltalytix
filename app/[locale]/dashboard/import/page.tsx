'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTradovateSyncStore } from '@/store/tradovate-sync-store'
import { handleTradovateCallback, storeTradovateToken } from '../components/import/tradovate/actions'
import { useI18n } from '@/locales/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function ImportCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tradovateStore = useTradovateSyncStore()
  const t = useI18n()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const hasProcessed = useRef(false)

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double execution (React StrictMode in development)
      if (hasProcessed.current) {
        console.log('Callback already processed, skipping...')
        return
      }
      
      hasProcessed.current = true
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        
        console.log('OAuth callback received:', { 
          hasCode: !!code, 
          hasState: !!state,
          state: state?.substring(0, 8) + '...',
          environment: tradovateStore.environment,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })

        if (!code) {
          setError('No authorization code received')
          setStatus('error')
          return
        }

        if (!state) {
          setError('No state parameter received')
          setStatus('error')
          return
        }

        // Verify state matches what we stored
        if (!tradovateStore || typeof tradovateStore.oauthState === 'undefined') {
          console.error('Tradovate store not properly initialized:', {
            hasStore: !!tradovateStore,
            oauthState: tradovateStore?.oauthState
          })
          setError('OAuth state not found - please try again')
          setStatus('error')
          return
        }

        if (state !== tradovateStore.oauthState) {
          console.error('State mismatch:', {
            received: state?.substring(0, 8) + '...',
            expected: tradovateStore.oauthState?.substring(0, 8) + '...',
            receivedLength: state?.length,
            expectedLength: tradovateStore.oauthState?.length
          })
          setError('Invalid state parameter - possible security issue')
          setStatus('error')
          return
        }

        // Exchange code for tokens
        const result = await handleTradovateCallback(code, state)
        
        // Defensive programming: ensure result is an object
        if (!result || typeof result !== 'object') {
          console.error('Invalid result from handleTradovateCallback:', result)
          setError('Invalid response from OAuth callback handler')
          setStatus('error')
          return
        }
        
        if (result.error) {
          console.error('OAuth callback error:', result.error)
          setError(result.error)
          setStatus('error')
          return
        }

        // Validate all required fields exist and are strings
        if (!result.accessToken || !result.refreshToken || !result.expiresAt) {
          console.error('Missing required fields in OAuth result:', {
            hasAccessToken: !!result.accessToken,
            hasRefreshToken: !!result.refreshToken,
            hasExpiresAt: !!result.expiresAt,
            result
          })
          setError('Invalid response from token exchange - missing required fields')
          setStatus('error')
          return
        }

        // Store tokens in Zustand
        tradovateStore.setTokens(result.accessToken, result.refreshToken, result.expiresAt)
        tradovateStore.setAuthenticated(true)
        tradovateStore.clearOAuthState()
        
        // Store tokens in database via server action
        try {
          const storeResult = await storeTradovateToken(result.accessToken, result.expiresAt, tradovateStore.environment)
          if (storeResult.error) {
            console.warn('Failed to store token in database:', storeResult.error)
            // Continue anyway - token is still valid for this session
          } else {
            console.log('Token stored in database successfully')
          }
        } catch (error) {
          console.warn('Failed to store token in database:', error)
          // Continue anyway - token is still valid for this session
        }
        
        console.log('OAuth flow completed successfully')
        setStatus('success')
        
        // Redirect back to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } catch (error) {
        console.error('OAuth callback error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          errorType: typeof error,
          errorString: String(error)
        })
        
        let errorMessage = 'Unknown error occurred'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message)
        }
        
        setError(errorMessage)
        setStatus('error')
      }
    }

    handleCallback()
  }, [searchParams, tradovateStore, router])

  const handleRetry = () => {
    hasProcessed.current = false
    tradovateStore.clearAll()
    router.push('/dashboard')
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            {t('tradovateSync.callback.title')}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && t('tradovateSync.callback.processing')}
            {status === 'success' && t('tradovateSync.callback.success')}
            {status === 'error' && t('tradovateSync.callback.error')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('tradovateSync.callback.exchangingCode')}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t('tradovateSync.callback.redirecting')}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  {t('tradovateSync.callback.retry')}
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard')} 
                  variant="secondary" 
                  className="w-full"
                >
                  {t('tradovateSync.callback.backToDashboard')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 