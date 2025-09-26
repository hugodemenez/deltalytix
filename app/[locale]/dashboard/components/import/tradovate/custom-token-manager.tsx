'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  CopyIcon, 
  EyeIcon, 
  EyeOffIcon, 
  PlusIcon, 
  TrashIcon, 
  TestTubeIcon,
  CheckIcon,
  XIcon,
  RefreshCwIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/locales/client"
import { 
  setCustomTradovateToken, 
  testCustomTradovateToken, 
  getAllTradovateTokens, 
  removeTradovateToken,
  getTradovateToken
} from './actions'

interface TokenData {
  id: string
  accountId: string
  token: string | null
  tokenExpiresAt: Date | null
  lastSyncedAt: Date
  createdAt: Date
  updatedAt: Date
  isExpired: boolean
  tokenPreview: string | null
}

export function CustomTokenManager() {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRevealed, setIsRevealed] = useState<Record<string, boolean>>({})
  
  // Form state
  const [formData, setFormData] = useState({
    accessToken: '',
    expiresAt: '',
    accountId: '',
    environment: 'demo' as 'demo' | 'live'
  })

  // Set default expiration date to 15 minutes from now
  useEffect(() => {
    const now = new Date()
    const expirationDate = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
    const formattedDate = formatDateForInput(expirationDate)
    
    setFormData(prev => ({
      ...prev,
      expiresAt: formattedDate
    }))
  }, [])
  
  const { toast } = useToast()
  const t = useI18n()

  // Helper function to format date for datetime-local input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Load tokens on mount
  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      setIsLoading(true)
      const result = await getAllTradovateTokens()
      if (result.tokens) {
        setTokens(result.tokens)
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Failed to load tokens:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestToken = async (token: string, environment: 'demo' | 'live') => {
    try {
      setIsTesting(true)
      const result = await testCustomTradovateToken(token, environment)
      
      if (result.success) {
        toast({
          title: "Token Test Successful",
          description: result.message,
        })
      } else {
        toast({
          title: "Token Test Failed",
          description: result.error || 'Unknown error',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const resetFormWithDefaults = () => {
    const now = new Date()
    const expirationDate = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
    const formattedDate = formatDateForInput(expirationDate)
    
    setFormData({
      accessToken: '',
      expiresAt: formattedDate,
      accountId: '',
      environment: 'demo'
    })
  }

  const handleSetToken = async () => {
    if (!formData.accessToken.trim() || !formData.expiresAt.trim() || !formData.accountId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const result = await setCustomTradovateToken(
        formData.accessToken,
        formData.expiresAt,
        formData.accountId,
        formData.environment
      )

      if (result.success) {
        toast({
          title: "Token Set Successfully",
          description: result.message,
        })
        setIsDialogOpen(false)
        resetFormWithDefaults()
        loadTokens()
      } else {
        toast({
          title: "Failed to Set Token",
          description: 'error' in result ? result.error : 'Unknown error',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveToken = async (accountId: string) => {
    try {
      setIsLoading(true)
      const result = await removeTradovateToken(accountId)
      
      if (result.success) {
        toast({
          title: "Token Removed",
          description: `Token for account ${accountId} has been removed`,
        })
        loadTokens()
      } else {
        toast({
          title: "Failed to Remove Token",
          description: result.error || 'Unknown error',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast({
      title: "Token Copied",
      description: "Access token copied to clipboard",
    })
  }

  const toggleReveal = (tokenId: string) => {
    setIsRevealed(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }))
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString()
  }

  const getExpirationStatus = (expiresAt: Date | null, isExpired: boolean) => {
    if (!expiresAt) return { label: 'No expiration', variant: 'secondary' as const }
    if (isExpired) return { label: 'Expired', variant: 'destructive' as const }
    
    const now = new Date()
    const exp = new Date(expiresAt)
    const hoursUntilExpiry = (exp.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilExpiry < 24) {
      return { label: 'Expires soon', variant: 'destructive' as const }
    } else if (hoursUntilExpiry < 168) { // 7 days
      return { label: 'Expires in days', variant: 'default' as const }
    } else {
      return { label: 'Valid', variant: 'default' as const }
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Custom Token Manager
        </CardTitle>
        <CardDescription>
          Manually set and manage Tradovate access tokens for testing or development
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Token Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (open) {
            resetFormWithDefaults()
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Custom Token
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Custom Token</DialogTitle>
              <DialogDescription>
                Set a custom Tradovate access token for testing or development purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <Textarea
                  id="accessToken"
                  placeholder="Enter your Tradovate access token..."
                  value={formData.accessToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiresAt">Expiration Date *</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountId">Account ID *</Label>
                <Input
                  id="accountId"
                  placeholder="e.g., my-test-account"
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value: 'demo' | 'live') => setFormData(prev => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false)
                resetFormWithDefaults()
              }}>
                Cancel
              </Button>
              <Button onClick={handleSetToken} disabled={isLoading}>
                {isLoading && <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />}
                Set Token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tokens Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Stored Tokens</h3>
            <Button variant="outline" size="sm" onClick={loadTokens} disabled={isLoading}>
              <RefreshCwIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No custom tokens found</p>
              <p className="text-sm">Add a token to get started</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => {
                    const status = getExpirationStatus(token.tokenExpiresAt, token.isExpired)
                    return (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.accountId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {isRevealed[token.id] ? token.token : token.tokenPreview}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReveal(token.id)}
                            >
                              {isRevealed[token.id] ? (
                                <EyeOffIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                            {token.token && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyToken(token.token!)}
                              >
                                <CopyIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(token.tokenExpiresAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(token.lastSyncedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {token.token && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTestToken(token.token!, 'demo')}
                                disabled={isTesting}
                              >
                                <TestTubeIcon className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Token</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove the token for account &quot;{token.accountId}&quot;? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveToken(token.accountId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <Separator />
        <div className="space-y-2">
          <h4 className="font-medium">Usage Instructions</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Test Token:</strong> Click the test tube icon to verify a token works</p>
            <p>• <strong>Copy Token:</strong> Click the copy icon to copy the token to clipboard</p>
            <p>• <strong>Reveal Token:</strong> Click the eye icon to show/hide the full token</p>
            <p>• <strong>Remove Token:</strong> Click the trash icon to delete a token</p>
            <p>• <strong>Account ID:</strong> Use descriptive names like &quot;dev-account&quot; or &quot;test-account&quot;</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
