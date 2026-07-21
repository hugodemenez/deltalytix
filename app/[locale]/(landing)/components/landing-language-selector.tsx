"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChangeLocale, useI18n } from "@/locales/landing-client";
import { cn } from "@/lib/utils";
import { useState } from "react";

const LANGUAGES = [
  { value: "en" as const, label: "English", flag: "🇬🇧" },
  { value: "fr" as const, label: "Français", flag: "🇫🇷" },
];

/** Landing-only language switcher — avoids full app locale + cmdk bundles. */
export function LandingLanguageSelector({
  className,
  triggerClassName,
  align = "end",
}: {
  className?: string;
  triggerClassName?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const changeLocale = useChangeLocale();
  const t = useI18n();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn("inline-flex h-9 w-9 px-0", triggerClassName)}
          aria-label={t("landing.navbar.changeLanguage")}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[200px] p-1", className)} align={align}>
        <div className="flex flex-col gap-0.5">
          {LANGUAGES.map((language) => (
            <button
              key={language.value}
              type="button"
              onClick={() => {
                changeLocale(language.value);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
              <span className="mr-2">{language.flag}</span>
              <span>{language.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
