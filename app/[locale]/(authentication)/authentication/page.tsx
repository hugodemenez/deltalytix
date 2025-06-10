'use client'

import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "../components/user-auth-form"
import { Logo } from "@/components/logo"
import { useI18n } from '@/locales/client'

export default function AuthenticationPage() {
  const t = useI18n()

  return (
    <div>
      <div className="flex relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-gray-900 p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 overflow-hidden">
          <Image src={"/auth-background.jpeg"} width={928} height={1232} className="opacity-35 w-full" alt="Auth abstract image background"></Image>
          </div>
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-10 h-10 fill-white"/>
              Deltalytix
            </Link>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                {t('authentication.testimonial')}
              </p>
              <footer className="text-sm">{t('authentication.testimonialAuthor')}</footer>
            </blockquote>
          </div>
        </div>
        <div className="p-4 lg:p-8">
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