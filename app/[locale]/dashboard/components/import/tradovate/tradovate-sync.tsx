'use client'

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/locales/client"
import { TradovateCredentialsManager } from './tradovate-credentials-manager'


export function TradovateSync({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const { toast } = useToast()
  const t = useI18n()

  const handleSelectAccount = (account: any) => {
    setSelectedAccount(account)
    // Here you could implement account editing functionality
    console.log('Selected account for editing:', account)
  }

  const handleAddNewAccount = () => {
    // This will be handled by the credentials manager
    // For now, we'll just show a toast or redirect to OAuth
    toast({
      title: t('tradovateSync.multiAccount.addNewAccount'),
      description: t('tradovateSync.multiAccount.addNewAccountDescription'),
    })
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold">{t('tradovateSync.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('tradovateSync.description')}
        </p>
      </div>

      <TradovateCredentialsManager
      />
    </div>
  )
} 