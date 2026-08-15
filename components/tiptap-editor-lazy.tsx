"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { TiptapEditorProps } from "@/components/tiptap-editor"

/**
 * TipTap / ProseMirror is browser-only. Keep it out of the dashboard SSR and
 * Cache Components resume tree — a production `next start` resume mismatch
 * (`Couldn't find all resumable slots…`) plus first mount of this editor is
 * what killed the page when Mindset was added.
 */
const TiptapEditorClient = dynamic(
  () => import("@/components/tiptap-editor").then((mod) => mod.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-full min-h-[12rem] w-full rounded-lg" />
    ),
  },
)

export function TiptapEditor(props: TiptapEditorProps) {
  return <TiptapEditorClient {...props} />
}
