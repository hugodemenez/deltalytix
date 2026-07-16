'use client'

import { RithmicSyncWrapper } from '@/app/[locale]/dashboard/components/import/rithmic/sync/rithmic-sync-connection'
import { TradovateSync } from '@/app/[locale]/dashboard/components/import/tradovate/sync/tradovate-sync'
import { DxFeedSync } from '@/app/[locale]/dashboard/components/import/dxfeed/sync/dxfeed-sync'
import { ThorSync } from '@/app/[locale]/dashboard/components/import/thor/thor-sync'
import type { ConnectionService } from '../actions'
import { useI18n } from '@/locales/client'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function ConnectServiceModal({
  service,
  onClose,
}: {
  service: ConnectionService | null
  onClose: () => void
}) {
  const t = useI18n()
  const open = service !== null

  const title =
    service === 'rithmic'
      ? t('connections.add.rithmic')
      : service === 'tradovate'
        ? t('connections.add.tradovate')
        : service === 'dxfeed'
          ? t('connections.add.dxfeed')
          : service === 'thor'
            ? t('connections.add.thor')
            : service === 'etp'
              ? t('connections.add.etp')
              : t('connections.addConnection')

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden rounded-none border-l border-black/10 bg-white p-0 dark:border-white/10 dark:bg-black sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="shrink-0 space-y-0 border-b border-black/10 px-4 py-3 text-left dark:border-white/10">
          <SheetTitle className="pr-8 text-lg font-normal tracking-tight">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
          {service === 'rithmic' && (
            <RithmicSyncWrapper
              setIsOpen={(next: boolean) => {
                if (!next) onClose()
              }}
            />
          )}
          {service === 'tradovate' && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TradovateSync />
            </div>
          )}
          {service === 'dxfeed' && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DxFeedSync />
            </div>
          )}
          {service === 'thor' && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ThorSync
                setIsOpen={(next: boolean) => {
                  if (!next) onClose()
                }}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
