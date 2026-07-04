'use client'

import React, { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"

export function CalendarResponsiveOverlay({
  trigger,
  popoverClassName,
  popoverAlign = "start",
  popoverSide = "right",
  popoverSideOffset = 5,
  drawerTitle,
  drawerDescription,
  children,
}: {
  trigger: (props: { onClick?: () => void }) => React.ReactNode
  popoverClassName?: string
  popoverAlign?: "start" | "center" | "end"
  popoverSide?: "top" | "right" | "bottom" | "left"
  popoverSideOffset?: number
  drawerTitle?: string
  drawerDescription?: string
  children: React.ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 640px)")

  if (isDesktop) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger({})}
        </PopoverTrigger>
        <PopoverContent
          className={popoverClassName}
          align={popoverAlign}
          side={popoverSide}
          sideOffset={popoverSideOffset}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {trigger({ onClick: () => setDrawerOpen(true) })}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent
          className="max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {(drawerTitle || drawerDescription) && (
            <DrawerHeader className="text-left">
              {drawerTitle && <DrawerTitle>{drawerTitle}</DrawerTitle>}
              {drawerDescription && <DrawerDescription>{drawerDescription}</DrawerDescription>}
            </DrawerHeader>
          )}
          <div className="overflow-y-auto px-4 pb-6">{children}</div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
