"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { getUserShared, deleteShared, updateSharedAccountNumbers } from "@/server/shared"
import { toast } from "sonner"
import { format } from "date-fns"
import { Trash2, Link, Calendar, Users, ArrowLeft, ExternalLink, Pencil, X, Check, ChevronsUpDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useUserStore } from "../../../../store/user-store"
import { useTradesStore } from "../../../../store/trades-store"
import { cn } from "@/lib/utils"

interface SharedLayout {
  id: string
  slug: string
  title: string | null
  description: string | null
  isPublic: boolean
  accountNumbers: string[]
  dateRange: {
    from: string
    to?: string
  }
  createdAt: Date
  expiresAt: Date | null
  viewCount: number
}


interface SharedLayoutsManagerProps {
  onBack: () => void
}

function SkeletonCard() {
  return (
    <Card className="flex h-full min-h-[260px] flex-col rounded-xl">
      <CardHeader className="p-4 pb-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
      <CardFooter className="border-t p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardFooter>
    </Card>
  )
}

export function SharedLayoutsManager({ onBack }: SharedLayoutsManagerProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const trades = useTradesStore(state => state.trades)
  const [sharedLayouts, setSharedLayouts] = useState<SharedLayout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState<SharedLayout | null>(null)
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false)
  const [accountsLayout, setAccountsLayout] = useState<SharedLayout | null>(null)
  const [editableAccountNumbers, setEditableAccountNumbers] = useState<string[]>([])
  const [accountsComboboxOpen, setAccountsComboboxOpen] = useState(false)
  const [isUpdatingAccounts, setIsUpdatingAccounts] = useState(false)

  const availableAccountNumbers = useMemo(() => {
    if (!trades || !Array.isArray(trades)) return []
    return Array.from(
      new Set(
        trades
          .map(trade => trade.accountNumber?.trim())
          .filter((account): account is string => Boolean(account))
      )
    ).sort()
  }, [trades])

  const loadSharedLayouts = useCallback(async () => {
    try {
      const layouts = await getUserShared(user!.id)
      const transformedLayouts = layouts.map(layout => ({
        ...layout,
        dateRange: layout.dateRange as { from: string; to?: string }
      }))
      setSharedLayouts(transformedLayouts)
    } catch (error) {
      console.error('Error loading shared layouts:', error)
      toast.error(t('share.error'), {
        description: t('share.error.loadFailed'),
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    if (user) {
      loadSharedLayouts()
    }
  }, [user, loadSharedLayouts])

  const handleDelete = async () => {
    if (!selectedLayout) return
    
    const layoutToDelete = selectedLayout
    setDeleteDialogOpen(false)
    setSelectedLayout(null)

    try {
      await deleteShared(layoutToDelete.slug, user!.id)
      setSharedLayouts(prev => prev.filter(layout => layout.slug !== layoutToDelete.slug))
      toast.success(t('share.deleteSuccess'))
    } catch (error) {
      console.error('Error deleting shared layout:', error)
      toast.error(t('share.error'), {
        description: t('share.error.deleteFailed'),
      })
      // Don't need to reopen dialog on error, as the item still exists in the list
    }
  }

  const copyShareLink = async (slug: string) => {
    const url = `${window.location.origin}/shared/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('share.urlCopied'))
    } catch (error) {
      console.error('Error copying URL:', error)
    }
  }

  const visitSharedLayout = (slug: string) => {
    window.open(`/shared/${slug}`, '_blank')
  }

  const openAccountsDialog = (layout: SharedLayout) => {
    const initialAccounts = layout.accountNumbers.length === 0
      ? availableAccountNumbers
      : layout.accountNumbers

    setAccountsLayout(layout)
    setEditableAccountNumbers(
      Array.from(
        new Set(
          initialAccounts
            .map(account => account.trim())
            .filter(Boolean)
        )
      )
    )
    setAccountsComboboxOpen(false)
    setAccountsDialogOpen(true)
  }

  const removeAccountNumber = (accountToRemove: string) => {
    setEditableAccountNumbers(prev => prev.filter(account => account !== accountToRemove))
  }

  const toggleAccountNumber = (account: string) => {
    setEditableAccountNumbers(prev => (
      prev.includes(account)
        ? prev.filter(item => item !== account)
        : [...prev, account]
    ))
  }

  const saveAccountNumbers = async () => {
    if (!accountsLayout || !user) return

    const normalizedAccountNumbers = Array.from(
      new Set(editableAccountNumbers.map(account => account.trim()).filter(Boolean))
    )

    setIsUpdatingAccounts(true)
    try {
      await updateSharedAccountNumbers(accountsLayout.slug, user.id, normalizedAccountNumbers)

      setSharedLayouts(prev => prev.map(layout =>
        layout.slug === accountsLayout.slug
          ? { ...layout, accountNumbers: normalizedAccountNumbers }
          : layout
      ))

      setAccountsDialogOpen(false)
      setAccountsLayout(null)
      toast.success(t('share.accountUpdateSuccess'))
    } catch (error) {
      console.error('Error updating shared layout account numbers:', error)
      toast.error(t('share.error'), {
        description: t('share.error.updateAccountsFailed'),
      })
    } finally {
      setIsUpdatingAccounts(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center justify-between w-full">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="hover:bg-background/80 transition-colors -ml-2 sm:ml-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('share.backToShare')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
        {sharedLayouts.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg sm:text-xl font-medium text-muted-foreground mb-2">
                  {t('share.noLayouts')}
                </p>
                <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                  {t('share.startSharing')}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {sharedLayouts.map((layout) => (
              <Card
                key={layout.slug}
                className="flex h-full min-h-[260px] flex-col rounded-xl border bg-card/90 shadow-sm"
              >
                <CardHeader className="p-4 pb-3">
                  <div>
                    <CardTitle className="mb-1 line-clamp-1 text-sm font-semibold sm:text-base">
                      {layout.title || t('share.untitledLayout')}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs text-muted-foreground/80">
                      {layout.description || t('share.noDescription')}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-muted-foreground/90">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs break-words">
                        {format(new Date(layout.dateRange.from), 'PP')}
                        {layout.dateRange.to && (
                          <>
                            {' - '}
                            {format(new Date(layout.dateRange.to), 'PP')}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground/90">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs break-words">
                        {layout.accountNumbers.length === 0
                          ? t('share.allAccounts')
                          : `${layout.accountNumbers.length} ${t('share.accounts')}`}
                      </span>
                    </div>
                    {layout.viewCount > 0 && (
                      <div className="flex items-start gap-2 text-muted-foreground/75">
                        <div className="h-1 w-1 rounded-full bg-current" />
                        <span className="text-xs">
                          {t('share.viewCount', { count: layout.viewCount })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t p-3 sm:p-4">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => visitSharedLayout(layout.slug)}
                      className="h-8 w-full justify-center px-2"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{t('share.visit')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(layout.slug)}
                      className="h-8 w-full justify-center px-2"
                    >
                      <Link className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{t('share.copyUrl')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAccountsDialog(layout)}
                      className="h-8 w-full justify-center px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{t('share.editAccounts')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLayout(layout)
                        setDeleteDialogOpen(true)
                      }}
                      className="h-8 w-full justify-center px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{t('share.delete')}</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] sm:max-h-[85vh] w-[calc(100%-32px)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('share.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('share.deleteConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="sm:flex-1"
            >
              {t('share.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="sm:flex-1"
            >
              {t('share.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountsDialogOpen} onOpenChange={setAccountsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] sm:max-h-[85vh] w-[calc(100%-32px)] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('share.editAccounts')}</DialogTitle>
            <DialogDescription>
              {t('share.editAccountsDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {availableAccountNumbers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('share.quickAddAccounts')}</p>
                <Popover open={accountsComboboxOpen} onOpenChange={setAccountsComboboxOpen} modal>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={accountsComboboxOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {editableAccountNumbers.length === 0
                          ? t('share.accountSearchPlaceholder')
                          : t('share.accountsSelected', { count: editableAccountNumbers.length })}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start" sideOffset={4}>
                    <Command>
                      <CommandInput placeholder={t('share.searchAccounts')} />
                      <CommandEmpty>{t('share.noAccountFound')}</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            value="toggle-all-accounts"
                            onSelect={() => {
                              if (editableAccountNumbers.length === availableAccountNumbers.length) {
                                setEditableAccountNumbers([])
                              } else {
                                setEditableAccountNumbers(availableAccountNumbers)
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                editableAccountNumbers.length === availableAccountNumbers.length
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="flex-1">{t('filters.selectAllAccounts')}</span>
                          </CommandItem>
                          {availableAccountNumbers.map(account => (
                            <CommandItem
                              key={account}
                              value={account}
                              onSelect={() => toggleAccountNumber(account)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  editableAccountNumbers.includes(account) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 truncate">{account}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('share.noAvailableAccounts')}</p>
            )}

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('share.selectedAccounts')}</p>
              {editableAccountNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('share.emptyAccountsHint')}</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                  <div className="flex flex-wrap gap-2">
                    {editableAccountNumbers.map(account => (
                      <Badge key={account} variant="secondary" className="gap-1 pr-1">
                        <span>{account}</span>
                        <button
                          type="button"
                          onClick={() => removeAccountNumber(account)}
                          className="rounded-sm p-0.5 hover:bg-muted"
                          aria-label={t('share.removeAccount', { account })}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setAccountsDialogOpen(false)}
              className="sm:flex-1"
            >
              {t('share.cancel')}
            </Button>
            <Button
              onClick={saveAccountNumbers}
              className="sm:flex-1"
              disabled={isUpdatingAccounts}
            >
              {isUpdatingAccounts ? t('share.savingAccounts') : t('share.saveAccountChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 