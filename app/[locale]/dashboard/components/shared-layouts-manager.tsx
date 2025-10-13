"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { getUserShared, deleteShared } from "@/server/shared"
import { toast } from "sonner"
import { format } from "date-fns"
import { Trash2, Link, Calendar, Users, ArrowLeft, ExternalLink } from "lucide-react"
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
import { useUserStore } from "../../../../store/user-store"

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
    <Card className="flex flex-col min-h-[280px]">
      <CardHeader className="p-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-3 border-t flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  )
}

export function SharedLayoutsManager({ onBack }: SharedLayoutsManagerProps) {
  const t = useI18n()
  const user = useUserStore(state => state.user)
  const [sharedLayouts, setSharedLayouts] = useState<SharedLayout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState<SharedLayout | null>(null)

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
  }, [user, toast, t])

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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center justify-between w-full">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {sharedLayouts.map((layout) => (
              <Card key={layout.slug} className="flex flex-col min-h-[280px]">
                <CardHeader className="p-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-medium line-clamp-1 mb-1">
                      {layout.title || t('share.untitledLayout')}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs text-muted-foreground/80">
                      {layout.description || t('share.noDescription')}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-4 pt-2">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-muted-foreground/90">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">
                        {format(new Date(layout.dateRange.from), 'PP')}
                        {layout.dateRange.to && (
                          <>
                            {' - '}
                            {format(new Date(layout.dateRange.to), 'PP')}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/90">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">
                        {layout.accountNumbers.length} {t('share.accounts')}
                      </span>
                    </div>
                    {layout.viewCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground/75">
                        <div className="h-1 w-1 rounded-full bg-current" />
                        <span className="text-xs">
                          {t('share.viewCount', { count: layout.viewCount })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-3 border-t flex flex-col gap-2">
                  <div className="flex gap-2 justify-center w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => visitSharedLayout(layout.slug)}
                      className="h-8 px-3"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      <span className="text-xs">{t('share.visit')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(layout.slug)}
                      className="h-8 px-3"
                    >
                      <Link className="h-3.5 w-3.5 mr-1.5" />
                      <span className="text-xs">{t('share.copyUrl')}</span>
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLayout(layout)
                      setDeleteDialogOpen(true)
                    }}
                    className="h-8 w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs">{t('share.delete')}</span>
                  </Button>
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
    </div>
  )
} 