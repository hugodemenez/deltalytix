"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { Pencil, Trash2, RotateCcw } from "lucide-react"
import { ShareButton } from "./share-button"
import { AddWidgetSheet } from "./add-widget-sheet"
import { FilterCommandMenu } from "./filters/filter-command-menu"
import { WidgetType, WidgetSize } from "../types/dashboard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useState, useEffect, useRef } from "react"
import { useToolbarSettingsStore } from "@/store/toolbar-settings-store"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface ToolbarProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  onEditToggle: () => void
  currentLayout: {
    desktop: any[]
    mobile: any[]
  }
  onRemoveAll: () => void
  onRestoreDefaults: () => void
}

export function Toolbar({
  onAddWidget,
  isCustomizing,
  onEditToggle,
  currentLayout,
  onRemoveAll,
  onRestoreDefaults
}: ToolbarProps) {
  const t = useI18n()
  const { isMobile } = useData()
  const { settings, setAutoHide } = useToolbarSettingsStore()
  
  // Handle auto-hide toggle with proper state management
  const handleAutoHideToggle = () => {
    const newValue = !settings.autoHide
    console.log('Toggling auto-hide from', settings.autoHide, 'to', newValue)
    setAutoHide(newValue)
    
    // Show toast notification
    toast.success(
      newValue ? t('toolbar.autoHideEnabled') : t('toolbar.autoHideDisabled'),
      {
        duration: 2000,
      }
    )
  }
  
  // Check if consent banner is visible
  const [isConsentVisible, setIsConsentVisible] = useState(false)
  
  // Auto-hide functionality
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(!settings.autoHide) // Start hidden if auto-hide is enabled
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasConsentBanner = document.body.hasAttribute('data-consent-banner')
      setIsConsentVisible(hasConsentBanner)
    })
    
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-consent-banner'] 
    })
    
    // Initial check
    setIsConsentVisible(document.body.hasAttribute('data-consent-banner'))
    
    return () => observer.disconnect()
  }, [])
  
  // Measure toolbar height
  useEffect(() => {
    if (toolbarRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setToolbarHeight(entry.contentRect.height)
        }
      })
      
      resizeObserver.observe(toolbarRef.current)
      
      return () => resizeObserver.disconnect()
    }
  }, [])
  
  // Handle auto-hide functionality
  useEffect(() => {
    if (!settings.autoHide) {
      setIsVisible(true)
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
        autoHideTimeoutRef.current = null
      }
      return
    }
    
    if (isHovered) {
      setIsVisible(true)
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
        autoHideTimeoutRef.current = null
      }
    } else {
      autoHideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, settings.autoHideDelay)
    }
    
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
    }
  }, [isHovered, settings.autoHide, settings.autoHideDelay])
  
  // Show toolbar when mouse moves near it
  useEffect(() => {
    if (!settings.autoHide) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const mouseY = e.clientY
      const mouseX = e.clientX
      const threshold = settings.showThreshold
      
      // Check if mouse is near bottom edge
      const shouldShow = mouseY > viewportHeight - threshold
      
      // Also check if mouse is near the toolbar area horizontally
      const toolbarCenterX = viewportWidth / 2
      const toolbarWidth = 400 // Approximate toolbar width
      const horizontalThreshold = toolbarWidth / 2 + 50
      const inHorizontalRange = Math.abs(mouseX - toolbarCenterX) < horizontalThreshold
      
      if (shouldShow && inHorizontalRange) {
        setIsVisible(true)
        setIsHovered(true)
      } else {
        setIsHovered(false)
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [settings.autoHide, settings.showThreshold])
  
  // Animation variants
  const toolbarVariants = {
    visible: {
      opacity: 1, // Always use full opacity
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    hidden: {
      opacity: 1, // Always use full opacity
      y: Math.max(toolbarHeight - 4, 0), // Show just 4px at the bottom
      scale: 0.9,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  }
  
  return (
    <ContextMenu>
      <ContextMenuTrigger>
                <motion.div
          ref={toolbarRef}
          className={cn(
            "fixed inset-x-0 mx-auto z-9999 w-fit",
            isConsentVisible ? "bottom-36 sm:bottom-20" : "bottom-4"
          )}
          style={{ 
            transform: 'translateZ(0)', // Force hardware acceleration
            willChange: 'transform, opacity' // Optimize for animations
          }}
          variants={toolbarVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Gradient strip overlay for hidden state */}
          {!isVisible && (
            <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent h-4 rounded-t-full pointer-events-none" />
          )}
          <motion.div 
            className="flex items-center justify-center gap-4 p-3 bg-background/95 border rounded-full shadow-lg relative"
          >
                <Button
                  variant={isCustomizing ? "default" : "ghost"}
                  onClick={onEditToggle}
                  className={cn(
                    "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
                    isMobile ? "w-10 p-0" : "min-w-[120px] gap-3 px-4"
                  )}
                >
                  <Pencil className={cn(
                    "h-4 w-4 shrink-0",
                    isCustomizing && "text-background"
                  )} />
                  {!isMobile && (
                    <span className="text-sm font-medium">
                      {isCustomizing ? t('widgets.done') : t('widgets.edit')}
                    </span>
                  )}
                </Button>

                <ShareButton currentLayout={currentLayout} />

                <AddWidgetSheet onAddWidget={onAddWidget} isCustomizing={isCustomizing} />

                <FilterCommandMenu variant="toolbar" />
                
                {isCustomizing && (
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
                          )}
                          title={t('widgets.restoreDefaults')}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('widgets.restoreDefaultsConfirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('widgets.restoreDefaultsConfirmDescription')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={onRestoreDefaults}>
                            {t('widgets.confirmRestoreDefaults')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className={cn(
                            "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
                          )}
                          title={t('widgets.deleteAll')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('widgets.deleteAllConfirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('widgets.deleteAllConfirmDescription')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={onRemoveAll}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('widgets.confirmDeleteAll')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </motion.div>
        </motion.div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48">
        <ContextMenuItem 
          onClick={handleAutoHideToggle}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center",
              settings.autoHide ? "bg-primary border-primary" : "border-muted-foreground"
            )}>
              {settings.autoHide && (
                <div className="w-2 h-2 bg-background rounded-sm" />
              )}
            </div>
            <span className="text-sm">{t('toolbar.autoHide')}</span>
          </div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
} 