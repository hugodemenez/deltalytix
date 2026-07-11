"use client";

import Image from "next/image";

import { useI18n } from "@/locales/landing-client";

export default function Partners() {
  const t = useI18n();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
      <h2 className="mb-9 text-center text-sm font-normal">
        {t("landing.partners.title")}
      </h2>
      <div className="mx-auto grid max-w-3xl grid-cols-1 items-center md:grid-cols-2">
        <a
          className="group flex min-h-20 items-center justify-center border-b border-black/10 px-6 dark:border-white/10 md:border-b-0 md:border-r"
          href="https://ninjatraderdomesticvendor.sjv.io/e1VQMz"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="relative h-6 w-full max-w-[144px] opacity-65 transition-opacity duration-150 ease-out group-hover:opacity-100 md:h-5 md:max-w-[120px] md:opacity-55">
            <Image
              src="/logos/ninjatrader-ob.svg"
              alt="NinjaTrader"
              fill
              sizes="(max-width: 767px) 144px, 120px"
              className="object-contain dark:brightness-0 dark:invert"
              priority
            />
          </span>
        </a>
        <div className="flex min-h-20 items-center justify-center px-6">
          <span className="relative h-6 w-full max-w-[402px] opacity-65 md:h-5 md:max-w-[335px] md:opacity-55">
            <Image
              src="/logos/rithmic-logo-black.png"
              alt="Rithmic"
              fill
              sizes="(max-width: 767px) 90vw, 335px"
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/logos/rithmic-logo-white.png"
              alt="Rithmic"
              fill
              sizes="(max-width: 767px) 90vw, 335px"
              className="hidden object-contain dark:block"
              priority
            />
          </span>
        </div>
      </div>
    </div>
  );
}
