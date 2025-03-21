import React, { useState, useCallback } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PlusCircleIcon, CheckCircle2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useToast } from "@/hooks/use-toast"

interface AccountSelectionProps {
  accounts: string[]
  accountNumber: string
  setAccountNumber: React.Dispatch<React.SetStateAction<string>>
  newAccountNumber: string
  setNewAccountNumber: React.Dispatch<React.SetStateAction<string>>
  onAddAccount?: (account: string) => void
}

export default function AccountSelection({
  accounts,
  accountNumber,
  setAccountNumber,
  newAccountNumber,
  setNewAccountNumber,
  onAddAccount
}: AccountSelectionProps) {
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false)
  const [localAccounts, setLocalAccounts] = useState<string[]>(accounts)
  const t = useI18n()
  const { toast } = useToast()

  const handleAddAccount = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (newAccountNumber.trim()) {
      if (localAccounts.includes(newAccountNumber.trim())) {
        toast({
          variant: "destructive",
          title: t('error'),
          description: t('import.error.accountExists')
        })
        return
      }
      setLocalAccounts(prev => [...prev, newAccountNumber.trim()])
      setAccountNumber(newAccountNumber.trim())
      onAddAccount?.(newAccountNumber.trim())
      setNewAccountNumber('')
      setIsAddingNewAccount(false)
    }
  }, [newAccountNumber, localAccounts, setAccountNumber, onAddAccount, setNewAccountNumber, t, toast])

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2">
        <Label className="text-lg font-semibold">
          {t('import.account.selectAccount')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('import.account.selectAccountDescription')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {localAccounts.map((account) => (
            <Card
              key={account}
              className={cn(
                "p-6 cursor-pointer hover:border-primary transition-colors relative group",
                accountNumber === account ? "border-primary bg-primary/5" : ""
              )}
              onClick={() => setAccountNumber(account)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="font-medium">{account}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('import.account.tradingAccount')}
                  </p>
                </div>
                {accountNumber === account && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </Card>
          ))}

          {/* Add New Account Card */}
          <Card
            className={cn(
              "p-6 cursor-pointer hover:border-primary transition-colors",
              isAddingNewAccount ? "border-primary" : ""
            )}
            onClick={() => !isAddingNewAccount && setIsAddingNewAccount(true)}
          >
            {isAddingNewAccount ? (
              <div className="space-y-4">
                <Input
                  id="newAccountNumber"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder={t('import.account.enterAccountNumber')}
                  className="w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAccount(e as any)
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={handleAddAccount}
                  >
                    {t('common.add')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsAddingNewAccount(false)
                      setNewAccountNumber('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <PlusCircleIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium text-muted-foreground">
                  {t('import.account.addNewAccount')}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}