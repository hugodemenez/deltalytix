"use client"

import { useId, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import {
  ChatGptAppIcon,
  ClaudeAppIcon,
} from "@/app/[locale]/(landing)/components/faq-open-with-icons"
import {
  DOCS_ASSISTANT_FALLBACK_ORIGIN,
  DOCS_ASSISTANTS,
  docsAssistantHref,
  docsAssistantPrompt,
  type DocsAssistant,
} from "./try-with-ai-links"

const ASSISTANT_ICON = {
  claude: ClaudeAppIcon,
  chatgpt: ChatGptAppIcon,
  grok: GrokAppIcon,
} as const

const ASSISTANT_NAME: Record<DocsAssistant, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  grok: "Grok",
}

type DocsTryWithAiProps = {
  label: string
  promptTemplate: string
  openLabel: Record<DocsAssistant, string>
}

function subscribeToOrigin() {
  return () => {}
}

function readBrowserOrigin() {
  return window.location.origin
}

/**
 * Assistant shortcuts for the docs header.
 * The prompt uses the page locale; the docs and OpenAPI URLs use this origin
 * so a beta host points at beta.
 */
export function DocsTryWithAi({
  label,
  promptTemplate,
  openLabel,
}: DocsTryWithAiProps) {
  const labelId = useId()
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    readBrowserOrigin,
    () => DOCS_ASSISTANT_FALLBACK_ORIGIN,
  )
  const prompt = docsAssistantPrompt(promptTemplate, origin)

  return (
    <div className="mt-8">
      <p id={labelId} className="text-sm text-black/60 dark:text-white/60">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="mt-3 flex flex-wrap gap-2"
      >
        {DOCS_ASSISTANTS.map((assistant) => {
          const Icon = ASSISTANT_ICON[assistant]
          return (
            <Button
              key={assistant}
              asChild
              variant="outline"
              size="sm"
              className="border-black/15 bg-transparent font-normal text-black shadow-none hover:bg-black/[0.03] dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/[0.04]"
            >
              <a
                href={docsAssistantHref(assistant, prompt)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={openLabel[assistant]}
              >
                <Icon className="size-4" />
                {ASSISTANT_NAME[assistant]}
              </a>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

/** Current Grok mark (the comet swirl), monochrome like the other docs icons. */
function GrokAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      role="img"
      viewBox="48 48 416 416"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M210.484 312.759L343.465 210.383C349.984 205.364 359.302 207.322 362.408 215.117C378.758 256.231 371.454 305.64 338.925 339.563C306.397 373.487 261.137 380.927 219.768 363.983L174.577 385.803C239.394 432.008 318.104 420.581 367.289 369.251C406.303 328.564 418.386 273.104 407.088 223.091L407.19 223.198C390.807 149.726 411.218 120.359 453.03 60.3072C454.02 58.8833 455.01 57.4595 456 56L400.978 113.382V113.204L210.45 312.794" />
      <path d="M183.042 337.641C136.519 291.294 144.54 219.567 184.236 178.203C213.59 147.59 261.683 135.096 303.666 153.464L348.755 131.75C340.632 125.627 330.221 119.042 318.275 114.414C264.277 91.2407 199.63 102.774 155.735 148.516C113.513 192.549 100.236 260.254 123.036 318.027C140.069 361.206 112.148 391.748 84.0229 422.575C74.0561 433.503 64.0553 444.431 56 456L183.007 337.677" />
    </svg>
  )
}
