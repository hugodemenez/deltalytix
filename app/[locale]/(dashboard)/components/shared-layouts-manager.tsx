"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useUserData } from "@/components/context/user-data"
import { useI18n } from "@/locales/client"
import { getUserShared, deleteShared } from "@/server/shared"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Trash2, Link, Calendar, Users, ArrowLeft, ExternalLink } from "lucide-react"
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

export function SharedLayoutsManager({ onBack }: SharedLayoutsManagerProps) {
  const t = useI18n()
  const { toast } = useToast()
  const { user } = useUserData()
  const [sharedLayouts, setSharedLayouts] = useState<SharedLayout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState<SharedLayout | null>(null)

  useEffect(() => {
    if (user) {
      loadSharedLayouts()
    }
  }, [user])

  const loadSharedLayouts = async () => {
    try {
      const layouts = await getUserShared(user!.id)
      const transformedLayouts = layouts.map(layout => ({
        ...layout,
        dateRange: layout.dateRange as { from: string; to?: string }
      }))
      setSharedLayouts(transformedLayouts)
    } catch (error) {
      console.error('Error loading shared layouts:', error)
      toast({
        title: t('share.error'),
        description: t('share.error.loadFailed'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedLayout) return

    try {
      await deleteShared(selectedLayout.slug, user!.id)
      setSharedLayouts(prev => prev.filter(layout => layout.slug !== selectedLayout.slug))
      toast({
        title: t('share.deleteSuccess'),
      })
    } catch (error) {
      console.error('Error deleting shared layout:', error)
      toast({
        title: t('share.error'),
        description: t('share.error.deleteFailed'),
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setSelectedLayout(null)
    }
  }

  const copyShareLink = async (slug: string) => {
    const url = `${window.location.origin}/shared/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: t('share.urlCopied'),
      })
    } catch (error) {
      console.error('Error copying URL:', error)
    }
  }

  const visitSharedLayout = (slug: string) => {
    window.open(`/shared/${slug}`, '_blank')
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
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

      <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-6 py-4 sm:py-6 w-full">
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
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-fr">
            {sharedLayouts.map((layout) => (
              <Card 
                key={layout.slug} 
                className="flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:border-primary/20 group"
              >
                <CardHeader className="flex-none space-y-2 px-4 sm:px-6 pb-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors mb-1">
                      {layout.title || t('share.untitledLayout')}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs sm:text-sm leading-normal">
                      {layout.description || t('share.noDescription')}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 px-4 sm:px-6 py-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground/90">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs leading-none">
                        {format(new Date(layout.dateRange.from), 'PP')}
                        {layout.dateRange.to && (
                          <>
                            <br className="sm:hidden" />
                            <span className="hidden sm:inline"> - </span>
                            {format(new Date(layout.dateRange.to), 'PP')}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground/90">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs leading-none">
                        {layout.accountNumbers.length} {t('share.accounts')}
                      </span>
                    </div>
                    {layout.viewCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground/75">
                        <div className="h-1 w-1 rounded-full bg-current" />
                        <span className="text-xs leading-none">
                          {t('share.viewCount', { count: layout.viewCount })}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 w-full mt-auto pt-3 border-t px-4 sm:px-6">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => visitSharedLayout(layout.slug)}
                      className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors text-xs h-8"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t('share.visit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(layout.slug)}
                      className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors text-xs h-8"
                    >
                      <Link className="h-3.5 w-3.5 mr-1.5" />
                      {t('share.copyUrl')}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLayout(layout)
                      setDeleteDialogOpen(true)
                    }}
                    className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-8"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('share.delete')}
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