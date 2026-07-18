'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { useI18n } from '@/locales/client'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { platforms, type PlatformConfig } from '@/app/[locale]/dashboard/components/import/config/platforms'
import { captureConnectionAddClicked } from '@/lib/connection-analytics'
import { PlatformTutorial } from '@/app/[locale]/dashboard/components/import/components/platform-tutorial'
import ImportButton from '@/app/[locale]/dashboard/components/import/import-button'
import {
  ServiceMonochromeLogo,
  ThemeAwareLogo,
} from '@/components/monochrome-logo'
import type { ConnectionService } from '../actions'
import { ConnectServiceModal } from './connect-service-modal'
import {
  ConnectionsRefreshProvider,
  useConnectionsRefresh,
} from './connections-refresh'

const SERVICE_SECTIONS: {
  service: ConnectionService
  labelKey: string
}[] = [
  { service: 'rithmic', labelKey: 'connections.sections.rithmic' },
  { service: 'tradovate', labelKey: 'connections.sections.tradovate' },
  { service: 'dxfeed', labelKey: 'connections.sections.dxfeed' },
  { service: 'thor', labelKey: 'connections.sections.thor' },
]

/**
 * Instant shell chrome for Connections: real header copy + actions.
 * Mounts outside the list Suspense boundary so hero animation runs once and
 * the list can stream (or resolve from `'use cache'`) independently.
 */
export function ConnectionsPageChrome({ children }: { children: ReactNode }) {
  return (
    <ConnectionsRefreshProvider>
      <ConnectionsPageChromeInner>{children}</ConnectionsPageChromeInner>
    </ConnectionsRefreshProvider>
  )
}

function ConnectionsPageChromeInner({ children }: { children: ReactNode }) {
  const t = useI18n()
  const { refresh } = useConnectionsRefresh()
  const [connectService, setConnectService] = useState<ConnectionService | null>(
    null
  )
  const [selectedImportPlatform, setSelectedImportPlatform] =
    useState<PlatformConfig | null>(null)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const fileImportPlatforms = useMemo(
    () => platforms.filter((p) => p.category !== 'Direct Account Sync'),
    []
  )

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height,4rem))] bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 md:py-14 lg:px-12">
        <header className={cn('mb-12 md:mb-16', 't-stagger')}>
          <h1 className="text-balance text-3xl font-normal tracking-[-0.04em] md:text-5xl">
            {t('connections.title')}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-black/55 md:text-lg dark:text-white/55">
            {t('connections.description')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-haspopup="menu"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] duration-150 hover:opacity-85 active:scale-[0.96] dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  {t('connections.addConnection')}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-auto min-w-[12rem] rounded-sm border-black/10 bg-white p-1 shadow-none dark:border-white/10 dark:bg-black"
              >
                <div role="menu" className="flex flex-col">
                  {SERVICE_SECTIONS.map((section) => (
                    <button
                      key={section.service}
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={() => {
                        setAddMenuOpen(false)
                        captureConnectionAddClicked(section.service)
                        setConnectService(section.service)
                      }}
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                        <ServiceMonochromeLogo
                          service={section.service}
                          alt=""
                          size={20}
                          className="h-5 w-5"
                        />
                      </span>
                      {t(section.labelKey as 'connections.sections.rithmic')}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {selectedImportPlatform ? (
              <div className="inline-flex h-11 items-center gap-1 rounded-sm border border-black/20 pl-1 pr-1 dark:border-white/20">
                <Popover open={importMenuOpen} onOpenChange={setImportMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                        {selectedImportPlatform.logo.path ? (
                          <ThemeAwareLogo
                            path={selectedImportPlatform.logo.path}
                            darkPath={selectedImportPlatform.logo.darkPath}
                            alt=""
                            size={16}
                            className="h-4 w-4"
                          />
                        ) : selectedImportPlatform.logo.component ? (
                          <span className="flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                            <selectedImportPlatform.logo.component />
                          </span>
                        ) : null}
                      </span>
                      {t(selectedImportPlatform.name as 'import.type.csvAi.name')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-64 rounded-sm border-black/10 bg-white p-1 shadow-none dark:border-white/10 dark:bg-black"
                  >
                    <div role="menu" className="flex max-h-80 flex-col overflow-y-auto">
                      {fileImportPlatforms.map((platform) => {
                        const key = platform.type || platform.platformName
                        const selected =
                          selectedImportPlatform.platformName ===
                          platform.platformName
                        return (
                          <button
                            key={key}
                            type="button"
                            role="menuitem"
                            className={cn(
                              'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5',
                              selected && 'bg-black/5 dark:bg-white/5'
                            )}
                            onClick={() => {
                              setImportMenuOpen(false)
                              setSelectedImportPlatform(platform)
                            }}
                          >
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                              {platform.logo.path ? (
                                <ThemeAwareLogo
                                  path={platform.logo.path}
                                  darkPath={platform.logo.darkPath}
                                  alt=""
                                  size={20}
                                  className="h-5 w-5"
                                />
                              ) : platform.logo.component ? (
                                <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
                                  <platform.logo.component />
                                </span>
                              ) : null}
                            </span>
                            {t(platform.name as 'import.type.csvAi.name')}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  aria-label={t('connections.clearImportType')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-black/45 transition-[opacity,transform,background-color,color] duration-150 hover:bg-black/5 hover:text-black active:scale-[0.96] dark:text-white/45 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => {
                    setImportMenuOpen(false)
                    setSelectedImportPlatform(null)
                  }}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <Popover open={importMenuOpen} onOpenChange={setImportMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-sm border border-black/20 px-6 text-sm font-medium transition-[opacity,transform,background-color] duration-150 hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:hover:bg-white/5"
                  >
                    {t('connections.selectImportType')}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 rounded-sm border-black/10 bg-white p-1 shadow-none dark:border-white/10 dark:bg-black"
                >
                  <div role="menu" className="flex max-h-80 flex-col overflow-y-auto">
                    {fileImportPlatforms.map((platform) => {
                      const key = platform.type || platform.platformName
                      return (
                        <button
                          key={key}
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                          onClick={() => {
                            setImportMenuOpen(false)
                            setSelectedImportPlatform(platform)
                          }}
                        >
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                            {platform.logo.path ? (
                              <ThemeAwareLogo
                                path={platform.logo.path}
                                darkPath={platform.logo.darkPath}
                                alt=""
                                size={20}
                                className="h-5 w-5"
                              />
                            ) : platform.logo.component ? (
                              <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
                                <platform.logo.component />
                              </span>
                            ) : null}
                          </span>
                          {t(platform.name as 'import.type.csvAi.name')}
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </header>

        {selectedImportPlatform && (
          <section className="mb-12 max-w-3xl space-y-10 border-y border-black/10 py-10 dark:border-white/10 md:mb-16 md:space-y-12 md:py-12">
            <PlatformTutorial
              selectedPlatform={selectedImportPlatform}
              setIsOpen={() => {}}
            />
            <ImportButton
              key={selectedImportPlatform.platformName}
              inline
              hideTrigger
              initialType={
                selectedImportPlatform.platformName === 'csv-ai'
                  ? 'csv-ai'
                  : selectedImportPlatform.type ||
                    selectedImportPlatform.platformName
              }
              onOpenChange={(open) => {
                if (!open) refresh()
              }}
            />
          </section>
        )}

        {children}
      </div>

      <ConnectServiceModal
        service={connectService}
        onClose={() => {
          setConnectService(null)
          refresh()
        }}
      />
    </div>
  )
}
