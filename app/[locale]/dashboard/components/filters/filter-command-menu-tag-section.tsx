"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, ChevronRight, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { HexColorPicker } from "react-colorful"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { useUserStore } from "../../../../../store/user-store"
import { useTradesStore } from "../../../../../store/trades-store"
import { createTagAction, deleteTagAction } from "@/server/tags"
import { toast } from "sonner"
import { Trade } from "@/prisma/generated/prisma/browser"

interface TagSectionProps {
  searchValue: string
}

interface TagFormData {
  name: string
  description: string | null
  color: string
}

export function TagSection({ searchValue }: TagSectionProps) {
  const { tagFilter, setTagFilter, updateTrades } = useData()
  const tags = useUserStore(state => state.tags)
  const setTags = useUserStore(state => state.setTags)
  const trades = useTradesStore(state => state.trades)
  const t = useI18n()
  const [filteredTags, setFilteredTags] = useState<typeof tags>([])
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false)
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: null,
    color: '#CBD5E1'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<typeof tags[0] | null>(null)
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false)
  const addTagItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Filter tags based on search value
    const filtered = tags?.filter(tag =>
      tag.name.toLowerCase().includes(searchValue.toLowerCase())
    ) ?? []
    setFilteredTags(filtered)
  }, [tags, searchValue])

  const handleSelectAll = () => {
    const allTagNames = tags?.map(tag => tag.name) ?? []
    const allSelected = allTagNames.length > 0 && 
      allTagNames.every(name => tagFilter.tags.includes(name))
    
    setTagFilter({
      tags: allSelected ? [] : allTagNames
    })
  }

  const handleSelect = (tagName: string) => {
    setTagFilter(prev => ({
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }))
  }

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
        setIsLoading(false)
        return
      }

      // Check if tag already exists
      const tagExists = tags?.some(tag => 
        tag.name === trimmedName
      )

      if (tagExists) {
        toast.error(t('widgets.tags.error'), {
          description: t('widgets.tags.tagExists'),
        })
        setIsLoading(false)
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

      // Reset form and close popover
      setFormData({ name: '', description: null, color: '#CBD5E1' })
      setIsAddPopoverOpen(false)

      toast.success(t('widgets.tags.success'), {
        description: t('widgets.tags.createSuccess'),
      })
    } catch (error) {
      console.error('Failed to create tag:', error)
      toast.error(t('widgets.tags.error'), {
        description: t('widgets.tags.createError'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (tag: typeof tags[0]) => {
    setTagToDelete(tag)
    setDeletePopoverOpen(true)
  }

  const confirmDelete = async () => {
    if (!tagToDelete) return
    
    setIsLoading(true)
    try {
      await deleteTagAction(tagToDelete.id)
      
      // Update local tags state and cache
      setTags(tags.filter(tag => tag.id !== tagToDelete.id))
      
      // Remove the tag from all trades 
      trades.forEach((trade: Trade) => {
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
      setDeletePopoverOpen(false)
    }
  }

  const isItemSelected = (tagName: string): boolean => {
    return tagFilter.tags.includes(tagName)
  }

  const allSelected = tags && tags.length > 0 && 
    tags.every(tag => isItemSelected(tag.name))

  return (
    <>
      <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen} modal={false}>
        <PopoverAnchor asChild>
          <div ref={addTagItemRef}>
            <CommandItem
              onSelect={() => {
                setIsAddPopoverOpen(true)
              }}
              className="flex items-center gap-2 px-2"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">{t('widgets.tags.addTag')}</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </CommandItem>
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="w-80 p-4" 
          align="end"
          side="right"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">{t('widgets.tags.addTag')}</h4>
              <p className="text-xs text-muted-foreground">{t('widgets.tags.description')}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">{t('widgets.tags.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('widgets.tags.namePlaceholder')}
                  disabled={isLoading}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs">{t('widgets.tags.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('widgets.tags.descriptionPlaceholder')}
                  disabled={isLoading}
                  className="resize-none h-16 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('widgets.tags.color')}</Label>
                <div className="flex gap-3 items-start">
                  <div
                    className="w-8 h-8 rounded-md border shadow-xs shrink-0"
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
              <Button type="submit" disabled={isLoading} className="w-full h-8 text-sm">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    {t('widgets.tags.saving')}
                  </div>
                ) : (
                  t('widgets.tags.create')
                )}
              </Button>
            </form>
          </div>
        </PopoverContent>
      </Popover>

      <CommandItem
        onSelect={handleSelectAll}
        className="flex items-center gap-2 px-2 bg-muted/50"
      >
        <Checkbox
          checked={allSelected}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">{t('widgets.tags.selectAll')}</span>
      </CommandItem>

      {filteredTags.map(tag => (
        <Popover 
          key={tag.id} 
          open={deletePopoverOpen && tagToDelete?.id === tag.id} 
          onOpenChange={(open) => {
            if (!open) {
              setDeletePopoverOpen(false)
              setTagToDelete(null)
            }
          }}
          modal={false}
        >
          <div className="group relative">
            <CommandItem
              onSelect={() => handleSelect(tag.name)}
              className="flex items-center gap-2 pl-6 pr-8"
            >
              <Checkbox
                checked={isItemSelected(tag.name)}
                className="h-4 w-4 shrink-0"
              />
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color || '#CBD5E1' }}
              />
              <span className="text-sm break-all pr-2 flex-1">
                {tag.name}
              </span>
            </CommandItem>
            <PopoverAnchor asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(tag)
                }}
                disabled={isLoading}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </PopoverAnchor>
            <PopoverContent 
              className="w-64 p-3" 
              align="end"
              side="right"
              sideOffset={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">{t('widgets.tags.deleteConfirmTitle')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t('widgets.tags.deleteConfirmDescription', { tag: tag.name })}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setDeletePopoverOpen(false)
                      setTagToDelete(null)
                    }}
                    disabled={isLoading}
                  >
                    {t('widgets.tags.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={confirmDelete}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        {t('widgets.tags.deleting')}
                      </div>
                    ) : (
                      t('widgets.tags.confirmDelete')
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </div>
        </Popover>
      ))}

      {filteredTags.length === 0 && tags && tags.length > 0 && (
        <CommandItem disabled className="text-sm text-muted-foreground px-2">
          {searchValue ? t('widgets.tags.noResults') : t('widgets.tags.noTags')}
        </CommandItem>
      )}
    </>
  )
}

