"use client"

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

type MdxCodeCopyProps = {
  children: ReactNode
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand("copy")
  textarea.remove()

  if (!copied) {
    throw new Error("Could not copy code")
  }
}

export function MdxCodeCopy({ children }: MdxCodeCopyProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const controls: HTMLElement[] = []
    const timers: number[] = []
    const codeBlocks = root.querySelectorAll<HTMLPreElement>(
      "figure[data-rehype-pretty-code-figure] > pre",
    )

    for (const pre of codeBlocks) {
      const figure = pre.parentElement
      if (!figure || figure.querySelector("[data-mdx-copy-button]")) {
        continue
      }

      figure.classList.add("group", "relative")

      const button = document.createElement("button")
      button.type = "button"
      button.dataset.mdxCopyButton = "true"
      button.className =
        "absolute right-2 top-2 inline-flex h-8 items-center justify-center rounded-sm border border-black/10 bg-background/90 px-2.5 text-xs font-medium text-black/60 shadow-sm backdrop-blur-sm transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/10 dark:text-white/60 dark:hover:text-white"
      button.setAttribute("aria-label", "Copy code")
      button.title = "Copy code"

      const buttonLabel = document.createElement("span")
      buttonLabel.setAttribute("aria-hidden", "true")
      buttonLabel.textContent = "Copy"
      button.append(buttonLabel)

      const status = document.createElement("span")
      status.className = "sr-only"
      status.setAttribute("aria-live", "polite")

      const handleCopy = async () => {
        const text = pre.querySelector("code")?.textContent ?? pre.textContent
        if (!text) return

        try {
          await copyText(text)
          buttonLabel.textContent = "Copied"
          button.setAttribute("aria-label", "Copied")
          button.title = "Copied"
          status.textContent = "Code copied to clipboard."
        } catch {
          buttonLabel.textContent = "Copy failed"
          button.setAttribute("aria-label", "Copy failed")
          button.title = "Copy failed"
          status.textContent = "Could not copy code."
        }

        const timer = window.setTimeout(() => {
          buttonLabel.textContent = "Copy"
          button.setAttribute("aria-label", "Copy code")
          button.title = "Copy code"
          status.textContent = ""
        }, 2000)
        timers.push(timer)
      }

      button.addEventListener("click", handleCopy)
      figure.append(button, status)
      controls.push(button, status)
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
      for (const control of controls) {
        control.remove()
      }
    }
  }, [])

  return <div ref={rootRef}>{children}</div>
}
