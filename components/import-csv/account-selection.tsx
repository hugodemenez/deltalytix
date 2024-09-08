import React, { useState } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircleIcon } from 'lucide-react'

interface AccountSelectionProps {
  accounts: string[]
  accountNumber: string
  setAccountNumber: React.Dispatch<React.SetStateAction<string>>
  newAccountNumber: string
  setNewAccountNumber: React.Dispatch<React.SetStateAction<string>>
}

export default function AccountSelection({
  accounts,
  accountNumber,
  setAccountNumber,
  newAccountNumber,
  setNewAccountNumber
}: AccountSelectionProps) {
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false)

  return (
    <div className="space-y-4">
      <Label htmlFor="accountNumber">Account Number</Label>
      {isAddingNewAccount ? (
        <div className="flex items-center space-x-2">
          <Input
            id="newAccountNumber"
            value={newAccountNumber}
            onChange={(e) => setNewAccountNumber(e.target.value)}
            placeholder="Enter new account number"
            className="flex-grow"
          />
          <Button
            variant="outline"
            onClick={() => {
              setIsAddingNewAccount(false)
              setNewAccountNumber('')
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <Select onValueChange={setAccountNumber} value={accountNumber}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account, index) => (
                <SelectItem key={index} value={account}>{account}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setIsAddingNewAccount(true)}
          >
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      )}
    </div>
  )
}