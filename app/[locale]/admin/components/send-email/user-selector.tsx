"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: string
  email: string
  firstName: string
  language: string
  createdAt: string
}

interface UserSelectorProps {
  users: User[]
  selectedUsers: string[]
  onSelectionChange: (userIds: string[]) => void
}

export function UserSelector({ users, selectedUsers, onSelectionChange }: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [languageFilter, setLanguageFilter] = useState<"all" | "fr" | "en">("all")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLanguage = languageFilter === "all" || user.language === languageFilter
    return matchesSearch && matchesLanguage
  })

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter((id) => id !== userId))
    } else {
      onSelectionChange([...selectedUsers, userId])
    }
  }

  const selectAll = () => onSelectionChange(filteredUsers.map((user) => user.id))

  const deselectAll = () => {
    const filteredIds = filteredUsers.map((user) => user.id)
    onSelectionChange(selectedUsers.filter((id) => !filteredIds.includes(id)))
  }

  const clearSelection = () => onSelectionChange([])

  const filteredLanguageTotal =
    languageFilter === "all" ? users.length : users.filter((user) => user.language === languageFilter).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="language-filter" className="text-sm">
            Language
          </Label>
          <Select value={languageFilter} onValueChange={(value: "all" | "fr" | "en") => setLanguageFilter(value)}>
            <SelectTrigger id="language-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={deselectAll}>
          Deselect All
        </Button>
        {selectedUsers.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {selectedUsers.length} of {filteredUsers.length} filtered users selected
          {languageFilter !== "all" && ` (${filteredLanguageTotal} total ${languageFilter === "fr" ? "FR" : "EN"} users)`}
        </span>
        {selectedUsers.length > 0 && <Badge variant="secondary">{selectedUsers.length}</Badge>}
      </div>

      <ScrollArea className="h-[500px] rounded-md border p-4">
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUsers.includes(user.id)
              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    isSelected && "bg-primary/5 border-primary"
                  )}
                  onClick={() => toggleUser(user.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleUser(user.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.firstName || "User"}</div>
                    <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {user.language}
                  </Badge>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}