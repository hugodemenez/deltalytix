'use client'

import { useCurrentLocale, useI18n } from '@/locales/client'
import { Button } from '@/components/ui/button'
import { SettingsDialog, SplitFooter, TextLink, primaryButtonClass } from './connections-ui'

export function HowItWorksDialog({
  open,
  onOpenChange,
  onUseToken,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseToken: () => void
}) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const steps = [
    {
      title: t('dashboard.settings.connections.how.step1.title'),
      body: t('dashboard.settings.connections.how.step1.body'),
    },
    {
      title: t('dashboard.settings.connections.how.step2.title'),
      body: (
        <>
          {t('dashboard.settings.connections.how.step2.before')}
          <span className="mx-px inline-block rounded-[4px] bg-[#171717] px-2 text-xs font-medium leading-[18px] text-white dark:bg-foreground dark:text-background">
            {t('dashboard.settings.connections.how.step2.pill')}
          </span>
          {t('dashboard.settings.connections.how.step2.after')}
        </>
      ),
    },
    {
      title: t('dashboard.settings.connections.how.step3.title'),
      body: t('dashboard.settings.connections.how.step3.body'),
    },
  ]

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={t('dashboard.settings.connections.how.title')}
      description={t('dashboard.settings.connections.how.description')}
    >
      <ol className="relative mt-5">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-3.5 pb-[18px] last:pb-0">
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute bottom-0.5 left-[13px] top-[30px] w-px bg-[#E5E5E5] dark:bg-border"
              />
            ) : null}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#E5E5E5] bg-[#FAFAFA] text-xs font-semibold text-[#404040] dark:border-border dark:bg-muted dark:text-foreground">
              {index + 1}
            </span>
            <div>
              <p className="mt-1 text-sm font-medium leading-5">{step.title}</p>
              <p className="mt-0.5 text-[13px] leading-[18px] text-[#686D67] dark:text-muted-foreground">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-[4px] border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 dark:border-border dark:bg-muted/40">
        <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.04em] text-[#686D67] dark:text-muted-foreground">
          {t('dashboard.settings.connections.how.example')}
        </p>
        <p className="mt-1 text-sm font-medium leading-5">
          {t('dashboard.settings.connections.how.exampleTitle')}
        </p>
        <p className="mt-1 text-[13px] leading-[18px] text-[#686D67] dark:text-muted-foreground">
          {t('dashboard.settings.connections.how.exampleBody')}
        </p>
        <div className="mt-3 flex items-center">
          <DiagramBox
            title={t('dashboard.settings.connections.how.brokers')}
            caption={t('dashboard.settings.connections.how.sources')}
          />
          <DiagramLink />
          <DiagramBox
            title="Deltalytix"
            caption={t('dashboard.settings.connections.how.sync')}
            emphasis
          />
          <DiagramLink />
          <DiagramBox
            title={t('dashboard.settings.connections.how.journal')}
            caption={t('dashboard.settings.connections.how.yourApp')}
          />
        </div>
        <TextLink href={`/${locale}/docs#trades`} className="mt-2.5 inline-block text-xs">
          {t('dashboard.settings.connections.how.exampleLink')}
        </TextLink>
      </div>

      <p className="mt-5 border-t border-[#E5E5E5] pt-4 text-[13px] leading-[18px] text-[#404040] dark:border-border dark:text-foreground">
        {t('dashboard.settings.connections.how.altBefore')}
        <TextLink onClick={onUseToken} className="text-[13px] text-[#171717] dark:text-foreground">
          {t('dashboard.settings.connections.how.useToken')}
        </TextLink>
      </p>

      <SplitFooter
        start={
          <span className="inline-flex items-center gap-2">
            <TextLink href={`/${locale}/docs#authentication`}>
              {t('dashboard.settings.connections.apiDocs')}
            </TextLink>
            <span className="text-xs text-[#A3A3A3]">
              {t('dashboard.settings.connections.how.oauth')}
            </span>
          </span>
        }
      >
        <Button type="button" className={primaryButtonClass} onClick={() => onOpenChange(false)}>
          {t('dashboard.settings.connections.how.gotIt')}
        </Button>
      </SplitFooter>
    </SettingsDialog>
  )
}

function DiagramBox({
  title,
  caption,
  emphasis = false,
}: {
  title: string
  caption: string
  emphasis?: boolean
}) {
  return (
    <div
      className={
        emphasis
          ? 'min-w-0 flex-1 rounded-[4px] border border-[#A3A3A3] bg-white px-1.5 py-2 text-center font-mono text-[11px] leading-[14px] text-[#171717] dark:bg-background dark:text-foreground'
          : 'min-w-0 flex-1 rounded-[4px] border border-[#E5E5E5] bg-white px-1.5 py-2 text-center font-mono text-[11px] leading-[14px] text-[#404040] dark:border-border dark:bg-background dark:text-foreground'
      }
    >
      {title}
      <span className="mt-0.5 block text-[10px] text-[#686D67] dark:text-muted-foreground">
        {caption}
      </span>
    </div>
  )
}

function DiagramLink() {
  return (
    <span className="relative h-px w-[22px] shrink-0 bg-[#A3A3A3]">
      <span className="absolute -right-px -top-0.5 size-[5px] rounded-full bg-[#A3A3A3]" />
    </span>
  )
}
