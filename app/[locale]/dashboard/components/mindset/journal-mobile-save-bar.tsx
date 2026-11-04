"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { useEffect, useState } from "react"

interface JournalMobileSaveBarProps {
  onCancel: () => void
  onSave: () => void
  isSaving?: boolean
}

export function JournalMobileSaveBar({
  onCancel,
  onSave,
  isSaving = false,
}: JournalMobileSaveBarProps) {
  const t = useI18n()
  const bottom = useSaveBarBottom()

  return (
    <div
      className="pointer-events-none fixed inset-x-3 z-[9] flex gap-2"
      style={{ bottom }}
    >
      <Button
        type="button"
        variant="outline"
        className="pointer-events-auto h-11 rounded-[10px] border-[#2a2a2a] bg-transparent px-3.5 text-[#bdbdbd] hover:bg-transparent hover:text-[#bdbdbd]"
        onClick={onCancel}
        disabled={isSaving}
      >
        {t("mindset.cancel")}
      </Button>
      <Button
        type="button"
        className="pointer-events-auto h-11 flex-1 rounded-[10px] bg-white font-semibold text-black hover:bg-white/90"
        onClick={onSave}
        disabled={isSaving}
      >
        {t("mindset.journaling.save")}
      </Button>
    </div>
  )
}

function useSaveBarBottom(): string {
  const [bottom, setBottom] = useState("calc(var(--mobile-toolbar-top, 5.5rem) + 8px)")

  useEffect(() => {
    const viewport = window.visualViewport
    const update = () => {
      const keyboardInset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0
      if (keyboardInset > 0) {
        setBottom(`${keyboardInset + 12}px`)
        return
      }
      setBottom("calc(var(--mobile-toolbar-top, 5.5rem) + 8px)")
    }

    update()
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return bottom
}
