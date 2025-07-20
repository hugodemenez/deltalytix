'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Link, 
  Unlink, 
  Mail, 
  MessageCircle, 
  Chrome,
  AlertCircle
} from "lucide-react"
import { 
  linkDiscordAccount, 
  linkGoogleAccount, 
  unlinkIdentity, 
  getUserIdentities 
} from "@/server/auth"
import { toast } from "sonner"
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

// Type for the Supabase getUserIdentities response
interface UserIdentity {
  id: string
  identity_id: string
  user_id: string
  identity_data?: { [key: string]: any }
  provider: string
  created_at?: string
  last_sign_in_at?: string
}

export function LinkedAccounts() {
  const t = useI18n()
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    loadIdentities()
    
    // Check if user just returned from linking an account
    const urlParams = new URLSearchParams(window.location.search)
    const linked = urlParams.get('linked')
    if (linked) {
      toast.success(t('auth.accountLinked'))
      // Clean up the URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('linked')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [])

  const loadIdentities = async () => {
    try {
      setLoading(true)
      const userIdentities = await getUserIdentities()
      // Handle the response structure - it returns { identities: [...] }
      const identitiesArray = (userIdentities?.identities || []) as UserIdentity[]
      setIdentities(identitiesArray)
    } catch (error) {
      console.error('Failed to load identities:', error)
      setIdentities([])
    } finally {
      setLoading(false)
    }
  }

  const handleLinkDiscord = async () => {
    try {
      setLinking(true)
      await linkDiscordAccount()
      // Note: The redirect will happen automatically, so we don't need to handle success here
    } catch (error) {
      console.error('Failed to link Discord:', error)
      toast.error(t('auth.linkingFailed'))
      setLinking(false)
    }
  }

  const handleLinkGoogle = async () => {
    try {
      setLinking(true)
      await linkGoogleAccount()
      // Note: The redirect will happen automatically, so we don't need to handle success here
    } catch (error) {
      console.error('Failed to link Google:', error)
      toast.error(t('auth.linkingFailed'))
      setLinking(false)
    }
  }

  const handleUnlink = async (identity: UserIdentity) => {
    try {
      await unlinkIdentity(identity)
      toast.success(t('auth.accountUnlinked'))
      await loadIdentities() // Reload the list
    } catch (error) {
      console.error('Failed to unlink identity:', error)
      toast.error(error instanceof Error ? error.message : t('auth.unlinkingFailed'))
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'discord':
        return <MessageCircle className="h-4 w-4" />
      case 'google':
        return <Chrome className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'discord':
        return t('auth.discordMethod')
      case 'google':
        return t('auth.googleMethod')
      case 'email':
        return t('auth.emailMethod')
      default:
        return provider
    }
  }

  const isDiscordLinked = identities.some(id => id.provider === 'discord')
  const isGoogleLinked = identities.some(id => id.provider === 'google')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t('auth.linkedAccounts')}
          </CardTitle>
          <CardDescription>
            {t('auth.linkedAccountsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          {t('auth.linkedAccounts')}
        </CardTitle>
        <CardDescription>
          {t('auth.linkedAccountsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Linked Accounts */}
        {identities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">{t('auth.primaryAccount')}</h4>
            <div className="space-y-3">
              {identities.map((identity, index) => (
                <div key={identity.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getProviderIcon(identity.provider)}
                    <div>
                      <p className="font-medium">
                        {identity.identity_data?.email || getProviderName(identity.provider)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getProviderName(identity.provider)}
                      </p>
                      {identity.last_sign_in_at && (
                        <p className="text-xs text-muted-foreground">
                          {t('auth.lastUsed')}: {new Date(identity.last_sign_in_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {identity.provider === 'email' && (
                      <Badge variant="secondary">{t('auth.primary')}</Badge>
                    )}
                    {identity.provider !== 'email' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Unlink className="mr-2 h-4 w-4" />
                            {t('auth.unlinkAccount')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('auth.unlinkConfirm')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('auth.unlinkConfirmDescription')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('auth.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleUnlink(identity)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t('auth.unlinkAccount')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Link New Accounts */}
        <div>
          <h4 className="text-sm font-medium mb-3">{t('auth.linkNewAccount')}</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {t('auth.linkAccountDescription')}
          </p>
          <div className="space-y-2">
            {!isDiscordLinked && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleLinkDiscord}
                disabled={linking}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('auth.linkDiscord')}
              </Button>
            )}
            {!isGoogleLinked && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleLinkGoogle}
                disabled={linking}
              >
                <Chrome className="mr-2 h-4 w-4" />
                {t('auth.linkGoogle')}
              </Button>
            )}
            {!isDiscordLinked && !isGoogleLinked && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('auth.noLinkedAccounts')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 