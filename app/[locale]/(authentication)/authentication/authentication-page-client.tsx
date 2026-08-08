'use client'

import Link from "next/link"

import { UserAuthForm } from "../components/user-auth-form"
import { Logo } from "@/components/logo"
import { TradingCandlestickIcon } from "@/components/trading-candlestick-icon"
import { useI18n } from '@/locales/client'

export default function AuthenticationPageClient() {
  const t = useI18n()

  return (
    <div className="bg-[oklch(0.97_0_0)] text-[oklch(0.17_0_0)] [--background:0_0%_96.1%] [--card:0_0%_100%] [--foreground:0_0%_9%] dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)] dark:[--background:0_0%_6.7%] dark:[--card:0_0%_0%] dark:[--foreground:0_0%_93%]">
      <div className="flex relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col border-r border-border bg-background p-10 text-foreground lg:flex">
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-10 w-10 fill-foreground"/>
              Deltalytix
            </Link>
          </div>
          <div className="relative z-20 flex flex-1 items-center">
            <TradingCandlestickIcon
              width={560}
              height={220}
              visibleCandles={18}
              className="h-[220px] w-full max-w-none text-foreground/50"
            />
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg text-foreground/90">
                {t('authentication.testimonial')}
              </p>
              <footer className="text-sm text-muted-foreground">{t('authentication.testimonialAuthor')}</footer>
            </blockquote>
          </div>
        </div>
        <div className="flex h-full items-center justify-center bg-card p-4 lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('authentication.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('authentication.description')}
              </p>
            </div>
            <UserAuthForm />
            <p className="px-8 text-center text-sm text-muted-foreground">
              {t('authentication.termsAndPrivacy.prefix')}{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                {t('authentication.termsAndPrivacy.terms')}
              </Link>{" "}
              {t('authentication.termsAndPrivacy.and')}{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                {t('authentication.termsAndPrivacy.privacy')}
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
