'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useState } from "react"
import { initiateTradovateOAuth } from './actions'

export function TradovateDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runDebugTest = async () => {
    setIsLoading(true)
    console.clear() // Clear console for better debugging
    
    try {
      const result = await initiateTradovateOAuth('demo')
      setDebugInfo({
        success: !result.error,
        result,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setDebugInfo({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkBrowserConsole = () => {
    alert('Please open your browser\'s Developer Tools (F12) and check the Console tab for detailed error messages.')
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Tradovate OAuth Debug Tool
        </CardTitle>
        <CardDescription>
          Use this tool to debug OAuth configuration issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Environment Variables Checklist:</h3>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">TRADOVATE_CLIENT_ID</Badge>
              <span className="text-sm text-muted-foreground">Should be: {process.env.TRADOVATE_CLIENT_ID}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">TRADOVATE_CLIENT_SECRET</Badge>
              <span className="text-sm text-muted-foreground">Should be: {process.env.TRADOVATE_CLIENT_SECRET}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">TRADOVATE_REDIRECT_URI</Badge>
              <span className="text-sm text-muted-foreground">Should be: {process.env.TRADOVATE_REDIRECT_URI}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <p><strong>Note:</strong> The OAuth URL will use <code>trader.tradovate.com/oauth</code> for authorization and <code>demo.tradovateapi.com/auth/oauthtoken</code> for token exchange.</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Fixed Issues:</h3>
          <ul className="text-sm space-y-1 text-green-600">
            <li>✅ Updated OAuth endpoint from /v1/oauth/authorize to /oauth</li>
            <li>✅ Updated token endpoint from /v1/oauth/token to /auth/oauthtoken</li>
            <li>✅ Using correct trader.tradovate.com domain for OAuth</li>
            <li>✅ Added validation for token response to prevent Invalid time value error</li>
            <li>✅ Prevented double execution in callback page (React StrictMode fix)</li>
            <li>✅ Added OAuth state persistence for callback verification</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Remaining Issues to Check:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Make sure your client ID ({process.env.TRADOVATE_CLIENT_ID}) is registered in Tradovate developer console</li>
            <li>• Verify redirect URI is whitelisted in Tradovate developer console</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Common Issues:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Environment variables not set in .env.local</li>
            <li>• Development server not restarted after adding env variables</li>
            <li>• Wrong redirect URI format (check for typos)</li>
            <li>• User not authenticated (try logging out and back in)</li>
            <li>• CORS issues with Tradovate API</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button onClick={runDebugTest} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Test OAuth Configuration'}
          </Button>
          <Button variant="outline" onClick={checkBrowserConsole}>
            Check Console Logs
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              {debugInfo.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-semibold">
                {debugInfo.success ? 'OAuth Test Successful!' : 'OAuth Test Failed'}
              </span>
            </div>
            
            <div className="text-sm">
              <p className="text-muted-foreground">Timestamp: {debugInfo.timestamp}</p>
              
              {debugInfo.success ? (
                <div className="mt-2">
                  <p className="text-green-600">✅ OAuth URL generated successfully</p>
                  <p className="text-xs break-all mt-1 p-2 bg-green-50 dark:bg-green-950 rounded">
                    {debugInfo.result.authUrl}
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-red-600">❌ Error: {debugInfo.result?.error || debugInfo.error}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Check the browser console for detailed logs
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Next Steps if test succeeds:</strong></p>
          <p>1. The OAuth URL will be logged in the console</p>
          <p>2. You can manually test by pasting the URL in a new tab</p>
          <p>3. You should see the Tradovate OAuth login page</p>
        </div>
      </CardContent>
    </Card>
  )
} 