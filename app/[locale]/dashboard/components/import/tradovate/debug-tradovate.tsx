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
      const result = await initiateTradovateOAuth()
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
      </CardContent>
    </Card>
  )
} 