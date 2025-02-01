"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/components/context/user-data"
import { useI18n } from "@/locales/client"
import { getUserShared, deleteShared } from "@/server/shared"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Trash2, Link, Calendar, Users, ArrowLeft } from "lucide-react"
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
  const { user } = useUser()
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

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('share.backToShare')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-6">
        {sharedLayouts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-muted-foreground text-center">
                {t('share.noLayouts')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sharedLayouts.map((layout) => (
              <Card key={layout.slug} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{layout.title || t('share.untitledLayout')}</CardTitle>
                  <CardDescription className="line-clamp-2">{layout.description || t('share.noDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {format(new Date(layout.dateRange.from), 'PP')}
                        {layout.dateRange.to && ` - ${format(new Date(layout.dateRange.to), 'PP')}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {layout.accountNumbers.length} {t('share.accounts')}
                      </span>
                    </div>
                    {layout.viewCount > 0 && (
                      <p className="text-muted-foreground">
                        {t('share.viewCount', { count: layout.viewCount })}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyShareLink(layout.slug)}
                    className="w-full sm:w-auto"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    {t('share.copyUrl')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLayout(layout)
                      setDeleteDialogOpen(true)
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('share.delete')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] sm:max-h-[85vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('share.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('share.deleteConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('share.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              {t('share.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 