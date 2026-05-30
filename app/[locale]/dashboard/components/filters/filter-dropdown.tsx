"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Filter } from "lucide-react"
import { useI18n } from "@/locales/client"
import { PnlFilter } from "./pnl-filter"
import { InstrumentFilter } from "./instrument-filter"
import { AccountFilter } from "./account-filter"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useModalStateStore } from "../../../../../store/modal-state-store"

export function FilterDropdown() {
  const t = useI18n()
  const { isMobile } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  const { accountGroupBoardOpen } = useModalStateStore()
  const open = accountGroupBoardOpen ? false : menuOpen

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={(nextOpen) => setMenuOpen(accountGroupBoardOpen ? false : nextOpen)}
      >
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost"
            className={cn(
              "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
              isMobile ? "w-10 p-0" : "min-w-[120px] gap-3 px-4"
            )}
          >
            <Filter className="h-4 w-4 shrink-0" />
            {!isMobile && (
              <span className="text-sm font-medium">
                {t('filters.title')}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-1rem))] w-56 overflow-y-auto overscroll-contain">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('filters.accounts')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-[min(var(--radix-dropdown-menu-content-available-height),calc(100dvh-1rem))] w-[min(300px,calc(100vw-2rem))] overflow-y-auto overscroll-contain">
                <AccountFilter showAccountNumbers={true}/>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('filters.pnl')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <PnlFilter />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('filters.instrument')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <InstrumentFilter />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  )
}