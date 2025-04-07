'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/locales/client'
import { useUserData } from '@/components/context/user-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, Edit2, Trash2, Search, Info } from 'lucide-react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HexColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils'
import { createTag, updateTag, deleteTag, syncTradeTagsToTagTable } from '@/server/tags'
import { useToast } from '@/hooks/use-toast'
import { Trade, Tag } from '@prisma/client'
import { WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
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
    user, 
    tagFilter, 
    setTagFilter, 
    removeTagFromAllTrades, 
    updateTrades, 
    trades: contextTrades,
    tags,
    setTags
  } = useUserData()
  const { toast } = useToast()
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
        toast({
          title: t('widgets.tags.error'),
          description: t('widgets.tags.nameRequired'),
          variant: 'destructive',
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
          toast({
            title: t('widgets.tags.error'),
            description: t('widgets.tags.tagExists'),
            variant: 'destructive',
          })
          return
        }

        const updatedTag = await updateTag(editingTag.id, {
          name: trimmedName,
          description: formData.description || undefined,
          color: formData.color
        })

        // Update tag metadata in context and cache
        setTags((prevTags: Tag[]) => {
          const newTags = prevTags.map(tag => 
            tag.name === oldTagName
              ? { ...tag, name: newTagName, color: formData.color, description: formData.description }
              : tag
          )
          return newTags
        })

        // If tag name changed, update all trades that use this tag
        if (oldTagName !== newTagName) {
          // Update trades that have this tag
          const updatedTrades = contextTrades
            .filter((trade: Trade) => trade.tags.includes(oldTagName))
            .map((trade: Trade) => ({
              id: trade.id,
              updates: {
                tags: trade.tags.map((tag: string) => 
                  tag === oldTagName ? newTagName : tag
                )
              }
            }))
          
          if (updatedTrades.length > 0) {
            updateTrades(updatedTrades)
          }

          // Update tag filter if the renamed tag was selected
          if (tagFilter.tags.includes(oldTagName)) {
            setTagFilter(prev => ({
              tags: prev.tags.map(tag => 
                tag === oldTagName ? newTagName : tag
              )
            }))
          }
        }

        toast({
          title: t('widgets.tags.success'),
          description: t('widgets.tags.updateSuccess'),
        })
      } else {
        // Check if tag already exists
        const tagExists = tags.some(tag => 
          tag.name === trimmedName
        )

        if (tagExists) {
          toast({
            title: t('widgets.tags.error'),
            description: t('widgets.tags.tagExists'),
            variant: 'destructive',
          })
          return
        }

        // Create new tag
        const newTag = await createTag({
          name: trimmedName,
          description: formData.description || undefined,
          color: formData.color
        })

        // Update tag metadata in context and cache
        setTags((prevTags: Tag[]) => {
          const newTags = [...prevTags, newTag.tag]
          return newTags
        })

        toast({
          title: t('widgets.tags.success'),
          description: t('widgets.tags.createSuccess'),
        })
      }
      
      setEditingTag(null)
      setFormData({ name: '', description: null, color: '#CBD5E1' })
    } catch (error) {
      console.error('Failed to save tag:', error)
      toast({
        title: t('widgets.tags.error'),
        description: editingTag ? t('widgets.tags.updateError') : t('widgets.tags.createError'),
        variant: 'destructive',
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
      await deleteTag(tagToDelete.id)
      
      // Update local tags state and cache
      setTags(prevTags => {
        const newTags = prevTags.filter(tag => tag.id !== tagToDelete.id)
        return newTags
      })
      
      // Remove the tag from all trades in the context
      removeTagFromAllTrades(tagToDelete.name)
      
      // Also remove from tag filter if it's selected
      if (tagFilter.tags.includes(tagToDelete.name)) {
        setTagFilter(prev => ({
          tags: prev.tags.filter(t => t !== tagToDelete.name)
        }))
      }
      
      toast({
        title: t('widgets.tags.success'),
        description: t('widgets.tags.deleteSuccess'),
      })
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast({
        title: t('widgets.tags.error'),
        description: t('widgets.tags.deleteError'),
        variant: 'destructive',
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

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => 
    tag.name.includes(searchQuery)
  )

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader 
          className={cn(
            "flex flex-row items-center justify-between space-y-0 pb-2 shrink-0",
            size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <CardTitle 
                className={cn(
                  "line-clamp-1",
                  size === 'small-long' ? "text-sm" : "text-base"
                )}
              >
                {t('widgets.tags.title')}
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className={cn(
                      "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                      size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t('widgets.tags.description')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              {tagFilter.tags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 lg:px-3 text-xs hover:bg-muted/50",
                    size === 'small-long' ? "h-6" : "h-8"
                  )}
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
                    className={cn(
                      "flex-shrink-0 hover:bg-muted/50",
                      size === 'small-long' ? "h-6 w-6" : "h-8 w-8"
                    )}
                    disabled={isLoading}
                  >
                    <Plus className={cn(
                      size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                    )} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTag ? t('widgets.tags.editTag') : t('widgets.tags.addTag')}
                    </DialogTitle>
                    <DialogDescription>
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
                            className="w-10 h-10 rounded-md border shadow-sm"
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
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
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
            </div>
          </div>
        </CardHeader>
        <CardContent 
          className={cn(
            "flex-1 min-h-0 overflow-hidden pt-0",
            size === 'small-long' ? "px-1" : "px-2 sm:px-4"
          )}
        >
          <div className="flex flex-col h-full space-y-3">
            {/* Search input */}
            <div className="flex items-center gap-2 shrink-0 bg-muted/30 rounded-md px-2">
              <Search className={cn(
                "text-muted-foreground",
                size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
              )} />
              <Input
                placeholder={t('widgets.tags.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                  size === 'small-long' ? "h-7 text-xs" : "h-8 text-sm"
                )}
              />
            </div>

            {/* Tag filters */}
            <div className="flex-1 min-h-0 -mx-1">
              <ScrollArea 
                className="h-full px-1"
                type="hover"
              >
                <div className={cn(
                  "space-y-0.5",
                  size === 'small-long' ? "min-h-[150px]" : "min-h-[200px]"
                )}>
                  {filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      className={cn(
                        "flex items-center justify-between rounded-md hover:bg-muted/50 transition-colors group",
                        size === 'small-long' ? "p-1" : "p-1.5"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
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
                          className={cn(
                            size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                          )}
                        />
                        <div
                          className={cn(
                            "rounded-full flex-shrink-0",
                            size === 'small-long' ? "w-2.5 h-2.5" : "w-3 h-3"
                          )}
                          style={{ backgroundColor: tag.color || '#CBD5E1' }}
                        />
                        <label
                          htmlFor={`tag-${tag.id}`}
                          className={cn(
                            "font-medium cursor-pointer truncate flex-1",
                            size === 'small-long' ? "text-xs" : "text-sm"
                          )}
                        >
                          {tag.name}
                          {tag.description && (
                            <span className={cn(
                              "text-muted-foreground ml-2",
                              size === 'small-long' ? "text-[10px]" : "text-xs"
                            )}>
                              - {tag.description}
                            </span>
                          )}
                        </label>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "hover:bg-muted",
                            size === 'small-long' ? "h-6 w-6" : "h-7 w-7"
                          )}
                          onClick={() => handleEdit(tag)}
                          disabled={isLoading}
                        >
                          <Edit2 className={cn(
                            size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "text-destructive hover:text-destructive hover:bg-destructive/10",
                            size === 'small-long' ? "h-6 w-6" : "h-7 w-7"
                          )}
                          onClick={() => handleDelete(tag)}
                          disabled={isLoading}
                        >
                          <Trash2 className={cn(
                            size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                          )} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredTags.length === 0 && (
                    <div className={cn(
                      "flex items-center justify-center text-muted-foreground h-[200px]",
                      size === 'small-long' ? "text-xs" : "text-sm"
                    )}>
                      {searchQuery ? t('widgets.tags.noResults') : t('widgets.tags.noTags')}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
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