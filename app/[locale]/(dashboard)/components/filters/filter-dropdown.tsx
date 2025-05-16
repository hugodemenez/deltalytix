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
import { useUserData } from "@/components/context/user-data"
import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AccountGroupBoard } from "./account-group-board"

export function FilterDropdown() {
  const t = useI18n()
  const { isMobile } = useUserData()
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const handleModalOpen = () => {
    setModalOpen(true)
    setOpen(false)
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
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
        <DropdownMenuContent className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('filters.accounts')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-[300px]">
                <AccountFilter showAccountNumbers={true} onModalOpen={handleModalOpen} />
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('filters.manageAccounts')}</DialogTitle>
          </DialogHeader>
          <AccountGroupBoard/>
        </DialogContent>
      </Dialog>
    </>
  )
}