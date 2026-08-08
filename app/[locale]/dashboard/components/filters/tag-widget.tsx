'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/locales/client'
import { useData } from '@/context/data-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HexColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils'
import { createTagAction, updateTagAction, deleteTagAction, syncTradeTagsToTagTableAction } from '@/server/tags'
import { toast } from "sonner"
import { Trade, Tag } from '@/prisma/generated/prisma/browser'
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTradesStore } from '../../../../../store/trades-store'
import { useUserStore } from '../../../../../store/user-store'
import {
  WidgetBody,
  WidgetCard,
  WidgetEmpty,
  WidgetHeader,
  isCompactSize,
  widgetType,
} from '../widgets'

interface TagType {
  id: string
  name: string
  description?: string | null
  color?: string | null
  createdAt: Date
  updatedAt: Date
}

interface TagFormData {
  name: string
  description: string | null
  color: string
}

interface TagWidgetProps {
  size?: WidgetSize
  onTagSelectionChange?: (selectedTags: string[]) => void
}

export function TagWidget({ size = 'medium', onTagSelectionChange }: TagWidgetProps) {
  const t = useI18n()
  const { 
    tagFilter, 
    setTagFilter, 
  updateTrades,
  } = useData()
  const contextTrades = useTradesStore(state => state.trades)
  const tags = useUserStore(state => state.tags)
  const setTags = useUserStore(state => state.setTags)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagType | null>(null)
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: null,
    color: '#CBD5E1'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagToDelete, setTagToDelete] = useState<TagType | null>(null)
  const [filteredTags, setFilteredTags] = useState<TagType[]>([])

  // Update parent component when selected tags change
  useEffect(() => {
    onTagSelectionChange?.(tagFilter.tags)
  }, [tagFilter.tags, onTagSelectionChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const trimmedName = formData.name.trim()
      
      // Check if name is empty
      if (!trimmedName) {
        toast.error(t('widgets.tags.error'), {
          description: t('widgets.tags.nameRequired'),
        })
        return
      }

      // Close dialog immediately
      setIsAddDialogOpen(false)
      
      if (editingTag) {
        const oldTagName = editingTag.name
        const newTagName = trimmedName

        // Check if new name already exists (excluding the current tag)
        const tagExists = tags.some(tag => 
          tag.id !== editingTag.id && tag.name === newTagName
        )

        if (tagExists) {
          toast.error(t('widgets.tags.error'), {
            description: t('widgets.tags.tagExists'),
          })
          return
        }

        const updatedTag = await updateTagAction(editingTag.id, {
          name: trimmedName,
          description: formData.description || undefined,
          color: formData.color
        })

        // Update tag metadata in context and cache
        const newTags = tags.map(tag => 
          tag.name === oldTagName
            ? { ...tag, name: newTagName, color: formData.color, description: formData.description }
            : tag
        )
        setTags(newTags)

        // If tag name changed, update all trades that use this tag
        if (oldTagName !== newTagName) {
          // Update trades that have this tag
          // We need to update trade by trade, as some trades may have multiple tags
          // and we need to update each one individually
          // This is a bit of a hack, but it's the only way to ensure that the trades are updated correctly

          // We need to find each trade which include the old tag name and replace it with the new tag name
          contextTrades.forEach((trade: Trade) => {
            if (trade.tags.includes(oldTagName)) {
              trade.tags = trade.tags.map((tag: string) => 
                tag === oldTagName ? newTagName : tag
              )
              updateTrades([trade.id], {
                tags: trade.tags.map((tag: string) => 
                  tag === oldTagName ? newTagName : tag
                )
              })
            }
          })
          
          // Update tag filter if the renamed tag was selected
          if (tagFilter.tags.includes(oldTagName)) {
            setTagFilter(prev => ({
              tags: prev.tags.map(tag => 
                tag === oldTagName ? newTagName : tag
              )
            }))
          }
        }

        toast.success(t('widgets.tags.success'), {
          description: t('widgets.tags.updateSuccess'),
        })
      } else {
        // Check if tag already exists
        const tagExists = tags.some(tag => 
          tag.name === trimmedName
        )

        if (tagExists) {
          toast.error(t('widgets.tags.error'), {
            description: t('widgets.tags.tagExists'),
          })
          return
        }

        // Create new tag
        const newTag = await createTagAction({
          name: trimmedName,
          description: formData.description || undefined,
          color: formData.color
        })

        // Update tag metadata in context and cache
        setTags([...tags, newTag.tag])

        toast.success(t('widgets.tags.success'), {
          description: t('widgets.tags.createSuccess'),
        })
      }
      
      setEditingTag(null)
      setFormData({ name: '', description: null, color: '#CBD5E1' })
    } catch (error) {
      console.error('Failed to save tag:', error)
      toast.error(t('widgets.tags.error'), {
        description: editingTag ? t('widgets.tags.updateError') : t('widgets.tags.createError'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (tag: TagType) => {
    setTagToDelete(tag)
  }

  const confirmDelete = async () => {
    if (!tagToDelete) return
    
    setIsLoading(true)
    try {
      await deleteTagAction(tagToDelete.id)
      
      // Update local tags state and cache
      setTags(tags.filter(tag => tag.id !== tagToDelete.id))
      
      // Remove the tag from all trades 
      contextTrades.forEach((trade: Trade) => {
        if (trade.tags.includes(tagToDelete.name)) {
          trade.tags = trade.tags.filter(tag => tag !== tagToDelete.name)
          updateTrades([trade.id], {
            tags: trade.tags
          })
        }
      })
      
      // Also remove from tag filter if it's selected
      if (tagFilter.tags.includes(tagToDelete.name)) {
        setTagFilter(prev => ({
          tags: prev.tags.filter(t => t !== tagToDelete.name)
        }))
      }
      
      toast.success(t('widgets.tags.success'), {
        description: t('widgets.tags.deleteSuccess'),
      })
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error(t('widgets.tags.error'), {
        description: t('widgets.tags.deleteError'),
      })
    } finally {
      setIsLoading(false)
      setTagToDelete(null)
    }
  }

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      description: tag.description ?? null,
      color: tag.color || '#CBD5E1'
    })
    setIsAddDialogOpen(true)
  }

  useEffect(() => {
    // Filter tags based on search query
    const filteredTags = tags?.filter(tag => 
      tag.name.includes(searchQuery)
    ) ?? []
    setFilteredTags(filteredTags)
  }, [tags, searchQuery])

  const compact = isCompactSize(size)
  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4"
  const actionButtonClass = compact ? "h-6 w-6" : "h-7 w-7"

  return (
    <>
      <WidgetCard>
        <WidgetHeader
          size={size}
          title={t('widgets.tags.title')}
          description={t('widgets.tags.description')}
          actions={
            <>
              {tagFilter.tags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("px-2 text-xs", compact ? "h-6" : "h-7")}
                  onClick={() => setTagFilter({ tags: [] })}
                >
                  {t('widgets.tags.clearFilter')}
                </Button>
              )}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("shrink-0", actionButtonClass)}
                    disabled={isLoading}
                    aria-label={t('widgets.tags.addTag')}
                  >
                    <Plus className={iconClass} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-balance">
                      {editingTag ? t('widgets.tags.editTag') : t('widgets.tags.addTag')}
                    </DialogTitle>
                    <DialogDescription className="text-pretty">
                      {t('widgets.tags.description')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('widgets.tags.name')}</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('widgets.tags.namePlaceholder')}
                          disabled={isLoading}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">{t('widgets.tags.description')}</Label>
                        <Textarea
                          id="description"
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t('widgets.tags.descriptionPlaceholder')}
                          disabled={isLoading}
                          className="resize-none h-20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('widgets.tags.color')}</Label>
                        <div className="flex gap-4 items-start">
                          <div
                            className="w-10 h-10 rounded-md border shadow-xs"
                            style={{ backgroundColor: formData.color }}
                          />
                          <div className="flex-1">
                            <HexColorPicker
                              color={formData.color}
                              onChange={(color) => setFormData({ ...formData, color })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent motion-safe:animate-spin" />
                            {t('widgets.tags.saving')}
                          </div>
                        ) : (
                          editingTag ? t('widgets.tags.save') : t('widgets.tags.create')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          }
        />
        <WidgetBody size={size} className="flex flex-col gap-3 overflow-hidden">
          {/* Search input: a form control, not a nested panel. */}
          <div className="relative shrink-0">
            <Search
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground",
                iconClass,
              )}
            />
            <Input
              placeholder={t('widgets.tags.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-7",
                // 16px on mobile so iOS does not zoom the viewport on focus (#404)
                compact ? "h-7 text-base sm:text-xs" : "h-8 text-base sm:text-sm"
              )}
            />
          </div>

          {/* Tag filters */}
          <div className="min-h-0 flex-1">
              <ScrollArea
                className="h-full"
                type="hover"
              >
                {filteredTags.length === 0 ? (
                  <WidgetEmpty
                    size={size}
                    className="min-h-[150px]"
                    message={searchQuery ? t('widgets.tags.noResults') : t('widgets.tags.noTags')}
                  />
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {filteredTags.map((tag) => (
                      <div
                        key={tag.id}
                        className={cn(
                          "group flex items-center justify-between gap-2 rounded-md motion-safe:transition-colors hover:bg-muted/50",
                          compact ? "p-1" : "p-1.5"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Checkbox
                            checked={tagFilter.tags.includes(tag.name)}
                            onCheckedChange={(checked) => {
                              setTagFilter(prev => ({
                                tags: checked
                                  ? [...prev.tags, tag.name]
                                  : prev.tags.filter(t => t !== tag.name)
                              }))
                            }}
                            id={`tag-${tag.id}`}
                            className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
                          />
                          {/* A tag pill: monochrome unless the tag carries a
                              user-chosen color, which is real information. */}
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="flex min-w-0 flex-1 cursor-pointer items-center"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-0.5",
                                      compact ? "text-xs" : "text-sm",
                                    )}
                                    style={tag.color ? { borderColor: tag.color } : undefined}
                                  >
                                    {tag.color ? (
                                      <span
                                        aria-hidden
                                        className="size-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: tag.color }}
                                      />
                                    ) : null}
                                    <span className="truncate">
                                      {tag.name.length > 35 ? `${tag.name.slice(0, 35)}...` : tag.name}
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px]">
                                  <div className="space-y-1">
                                    <p className="font-medium wrap-break-word">{tag.name}</p>
                                    {tag.description && (
                                      <p className={cn(widgetType.caption, "wrap-break-word whitespace-pre-wrap")}>{tag.description}</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </label>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 motion-safe:transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={actionButtonClass}
                            onClick={() => handleEdit(tag)}
                            disabled={isLoading}
                            aria-label={t('widgets.tags.editTag')}
                          >
                            <Edit2 className={iconClass} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("text-destructive hover:text-destructive", actionButtonClass)}
                            onClick={() => handleDelete(tag)}
                            disabled={isLoading}
                            aria-label={t('widgets.tags.confirmDelete')}
                          >
                            <Trash2 className={iconClass} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
        </WidgetBody>
      </WidgetCard>

      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('widgets.tags.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('widgets.tags.deleteConfirmDescription', { tag: tagToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {t('widgets.tags.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent motion-safe:animate-spin" />
                  {t('widgets.tags.deleting')}
                </div>
              ) : (
                t('widgets.tags.confirmDelete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
