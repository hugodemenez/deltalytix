"use client"

import { ClientOnlyLazy } from "@/components/client-only-lazy"
import { Skeleton } from "@/components/ui/skeleton"
import type { TiptapEditorProps } from "@/components/tiptap-editor"

function loadTiptapEditor() {
  return import("@/components/tiptap-editor").then((mod) => mod.TiptapEditor)
}

/**
 * TipTap / ProseMirror is browser-only. Load it after hydration so it is not
 * part of the dashboard SSR or Cache Components resume tree.
 */
export function TiptapEditor(props: TiptapEditorProps) {
  return (
    <ClientOnlyLazy
      load={loadTiptapEditor}
      fallback={<Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />}
      {...props}
    />
  )
}
