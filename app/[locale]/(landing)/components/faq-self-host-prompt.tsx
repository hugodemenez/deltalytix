"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/locales/landing-client";
import {
  getClaudePromptUrl,
  getCodexPromptUrl,
  getCursorPromptUrl,
  getSelfHostAgentPrompt,
} from "@/lib/self-host-agent-prompt";

export function FaqSelfHostPrompt() {
  const t = useI18n();
  const prompt = getSelfHostAgentPrompt();
  const [copied, setCopied] = useState(false);

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          className="border-black/15 bg-transparent shadow-none dark:border-white/15"
        >
          <a
            href={getCursorPromptUrl(prompt)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("faq.selfHost.openCursor")}
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          className="border-black/15 bg-transparent shadow-none dark:border-white/15"
        >
          <a href={getCodexPromptUrl(prompt)}>
            {t("faq.selfHost.openCodex")}
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          asChild
          className="border-black/15 bg-transparent shadow-none dark:border-white/15"
        >
          <a
            href={getClaudePromptUrl(prompt)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("faq.selfHost.openClaude")}
            <ExternalLinkIcon className="size-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
