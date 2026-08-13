'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
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

interface UserIdentity {
  id: string
  identity_id: string
  user_id: string
  identity_data?: Record<string, unknown>
  provider: string
  created_at?: string
  last_sign_in_at?: string
}

function ProviderRow({
  name,
  linked,
  linking,
  onLink,
  onUnlink,
}: {
  name: string
  linked: boolean
  linking: boolean
  onLink: () => void
  onUnlink: () => void
}) {
  const t = useI18n()
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3 last:border-b-0 dark:border-border">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#171717] dark:text-foreground">{name}</p>
        <p className="mt-0.5 text-xs text-[#686D67] dark:text-muted-foreground">
          {linked
            ? t('dashboard.settings.page.signInStatus')
            : t('dashboard.settings.page.notLinked')}
        </p>
      </div>
      {linked ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={linking}
              className="h-8 rounded-[4px] border-[#E5E5E5] px-3 text-sm dark:border-border"
            >
              {t('dashboard.settings.page.linked')}
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
                onClick={onUnlink}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('auth.unlinkAccount')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={linking}
          onClick={onLink}
          className="h-8 rounded-[4px] border-[#E5E5E5] px-3 text-sm dark:border-border"
        >
          {t('dashboard.settings.page.link')}
        </Button>
      )}
    </div>
  )
}

export function LinkedAccounts() {
  const t = useI18n()
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadIdentities = async () => {
      try {
        const userIdentities = await getUserIdentities()
        if (cancelled) return
        const identitiesArray = (userIdentities?.identities || []) as UserIdentity[]
        setIdentities(identitiesArray)
      } catch (error) {
        console.error('Failed to load identities:', error)
        if (!cancelled) setIdentities([])
      }
    }

    void loadIdentities()

    const urlParams = new URLSearchParams(window.location.search)
    const linked = urlParams.get('linked')
    if (linked) {
      toast.success(t('auth.accountLinked'))
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('linked')
      window.history.replaceState({}, '', newUrl.toString())
    }

    return () => {
      cancelled = true
    }
  }, [t])

  const refreshIdentities = async () => {
    try {
      const userIdentities = await getUserIdentities()
      const identitiesArray = (userIdentities?.identities || []) as UserIdentity[]
      setIdentities(identitiesArray)
    } catch (error) {
      console.error('Failed to load identities:', error)
      setIdentities([])
    }
  }

  const handleLinkDiscord = async () => {
    try {
      setLinking(true)
      await linkDiscordAccount()
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
    } catch (error) {
      console.error('Failed to link Google:', error)
      toast.error(t('auth.linkingFailed'))
      setLinking(false)
    }
  }

  const handleUnlink = async (provider: 'google' | 'discord') => {
    const identity = identities.find((id) => id.provider === provider)
    if (!identity) return
    try {
      await unlinkIdentity(identity)
      toast.success(t('auth.accountUnlinked'))
      await refreshIdentities()
    } catch (error) {
      console.error('Failed to unlink identity:', error)
      toast.error(error instanceof Error ? error.message : t('auth.unlinkingFailed'))
    }
  }

  const isDiscordLinked = identities.some(id => id.provider === 'discord')
  const isGoogleLinked = identities.some(id => id.provider === 'google')

  return (
    <>
      <ProviderRow
        name={t('auth.googleMethod')}
        linked={isGoogleLinked}
        linking={linking}
        onLink={handleLinkGoogle}
        onUnlink={() => handleUnlink('google')}
      />
      <ProviderRow
        name={t('auth.discordMethod')}
        linked={isDiscordLinked}
        linking={linking}
        onLink={handleLinkDiscord}
        onUnlink={() => handleUnlink('discord')}
      />
    </>
  )
}
