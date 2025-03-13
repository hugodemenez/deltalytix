'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useI18n } from '@/locales/client'

interface Account {
  account_id: string
  fcm_id: string
}

interface AccountComparisonDialogProps {
  isOpen: boolean
  onClose: () => void
  savedAccounts: string[]
  availableAccounts: Account[]
  onConfirm: (selectedAccounts: string[]) => void
}

export function AccountComparisonDialog({
  isOpen,
  onClose,
  savedAccounts,
  availableAccounts,
  onConfirm
}: AccountComparisonDialogProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(savedAccounts)
  const t = useI18n()

  // Find new and removed accounts
  const newAccounts = availableAccounts.filter(acc => !savedAccounts.includes(acc.account_id))
  const removedAccounts = savedAccounts.filter(acc => 
    !availableAccounts.find(available => available.account_id === acc)
  )

  const handleConfirm = () => {
    onConfirm(selectedAccounts)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rithmic.accountChanges.title')}</DialogTitle>
          <DialogDescription>
            {t('rithmic.accountChanges.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select All Checkbox */}
          <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
            <Checkbox
              id="select-all"
              checked={availableAccounts.length > 0 && selectedAccounts.length === availableAccounts.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedAccounts(availableAccounts.map(acc => acc.account_id))
                } else {
                  setSelectedAccounts([])
                }
              }}
            />
            <Label 
              htmlFor="select-all"
              className="flex-1 cursor-pointer font-medium"
            >
              {t('rithmic.selectAllAccounts')}
            </Label>
          </div>

          {/* New Accounts Section */}
          {newAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-500">
                {t('rithmic.accountChanges.newAccounts')}
              </h4>
              {newAccounts.map((account) => (
                <div key={account.account_id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <Checkbox
                    id={account.account_id}
                    checked={selectedAccounts.includes(account.account_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAccounts([...selectedAccounts, account.account_id])
                      } else {
                        setSelectedAccounts(selectedAccounts.filter(id => id !== account.account_id))
                      }
                    }}
                  />
                  <Label 
                    htmlFor={account.account_id}
                    className="flex-1 cursor-pointer"
                  >
                    {account.account_id}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({t('rithmic.fcmId')}: {account.fcm_id})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Existing Accounts Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-blue-500">
              {t('rithmic.accountChanges.existingAccounts')}
            </h4>
            {availableAccounts
              .filter(acc => savedAccounts.includes(acc.account_id))
              .map((account) => (
                <div key={account.account_id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <Checkbox
                    id={account.account_id}
                    checked={selectedAccounts.includes(account.account_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAccounts([...selectedAccounts, account.account_id])
                      } else {
                        setSelectedAccounts(selectedAccounts.filter(id => id !== account.account_id))
                      }
                    }}
                  />
                  <Label 
                    htmlFor={account.account_id}
                    className="flex-1 cursor-pointer"
                  >
                    {account.account_id}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({t('rithmic.fcmId')}: {account.fcm_id})
                    </span>
                  </Label>
                </div>
              ))}
          </div>

          {/* Removed Accounts Section */}
          {removedAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">
                {t('rithmic.accountChanges.removedAccounts')}
              </h4>
              {removedAccounts.map((accountId) => (
                <div key={accountId} className="flex items-center space-x-2 p-2 rounded bg-muted/50">
                  <Label className="flex-1 text-muted-foreground">
                    {accountId}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('common.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 