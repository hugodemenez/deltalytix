"use client";

import { type ReactNode, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/locales/landing-client";
import {
  getChatGptPromptUrl,
  getClaudePromptUrl,
  getCursorPromptUrl,
  getSelfHostAgentPrompt,
} from "@/lib/self-host-agent-prompt";
import {
  ChatGptAppIcon,
  ClaudeAppIcon,
  CursorAppIcon,
} from "./faq-open-with-icons";

export function FaqSelfHostPrompt() {
  const t = useI18n();
  const prompt = getSelfHostAgentPrompt();
  const [copied, setCopied] = useState(false);
  const [openWithOpen, setOpenWithOpen] = useState(false);

  const openWithOptions: {
    key: string;
    href: string;
    label: string;
    icon: ReactNode;
  }[] = [
    {
      key: "cursor",
      href: getCursorPromptUrl(prompt),
      label: t("faq.selfHost.openCursor"),
      icon: <CursorAppIcon className="size-4 shrink-0" />,
    },
    {
      key: "chatgpt",
      href: getChatGptPromptUrl(prompt),
      label: t("faq.selfHost.openChatGpt"),
      icon: <ChatGptAppIcon className="size-4 shrink-0" />,
    },
    {
      key: "claude",
      href: getClaudePromptUrl(prompt),
      label: t("faq.selfHost.openClaude"),
      icon: <ClaudeAppIcon className="size-4 shrink-0" />,
    },
  ];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success(t("faq.selfHost.copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("faq.selfHost.copyFailed"));
    }
  }

  return (
    <div className="mt-5 space-y-3 text-left">
      <p className="text-sm font-medium text-black/70 dark:text-white/70">
        {t("faq.selfHost.promptLabel")}
      </p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-sm border border-black/10 bg-black/[0.03] p-4 font-mono text-xs leading-relaxed text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
        {prompt}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="border-black/15 bg-transparent shadow-none dark:border-white/15"
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? t("faq.selfHost.copied") : t("faq.selfHost.copy")}
        </Button>
        <Popover open={openWithOpen} onOpenChange={setOpenWithOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-black/15 bg-transparent shadow-none dark:border-white/15"
            >
              {t("faq.selfHost.openWith")}
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1">
            <div className="flex flex-col">
              {openWithOptions.map((option) => (
                <a
                  key={option.key}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenWithOpen(false)}
                  className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {option.icon}
                  <span className="flex-1">{option.label}</span>
                  <ExternalLinkIcon className="size-3.5 shrink-0 opacity-50" />
                </a>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
