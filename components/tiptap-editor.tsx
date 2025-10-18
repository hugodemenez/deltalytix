"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { BubbleMenu as BubbleMenuExtension } from "@tiptap/extension-bubble-menu";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import UnderlineExtension from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Image as ImageIcon,
  Quote,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Check,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useState, useEffect, useRef, act } from "react";
import { useUserStore } from "@/store/user-store";
import { toast } from "sonner";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useChat, useCompletion } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { NewsSubMenu } from "@/components/ai-elements/news-sub-menu";
import { FinancialEvent } from "@prisma/client";
import { ActionSchema as EditorAction } from "@/app/api/ai/editor/route";
import { z } from "zod";

const supabase = createClient();

// AI Content Mark Extension to style AI-generated content
import { Mark } from "@tiptap/core";

const AIContentMark = Mark.create({
  name: "aiContent",

  addAttributes() {
    return {
      class: {
        default: "ai-generated-content",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-ai-content]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-ai-content": "true",
        class: "ai-generated-content",
      },
      0,
    ];
  },
});

// AI Completion Extension to manage streaming state
const AICompletionExtension = StarterKit.extend({
  name: "aiCompletion",
  link: false,

  addStorage() {
    return {
      insertPosition: null as number | null,
      lastInsertedLength: 0,
    };
  },

  addCommands() {
    return {
      startAICompletion: (position: number) => () => {
        this.storage.insertPosition = position;
        this.storage.lastInsertedLength = 0;
        return true;
      },
      updateAICompletion:
        (completion: string) =>
        ({ commands }: { commands: any }) => {
          if (this.storage.insertPosition === null) return false;

          const delta = completion.slice(this.storage.lastInsertedLength);

          if (delta.length > 0) {
            const newPosition =
              this.storage.insertPosition + this.storage.lastInsertedLength;
            commands.insertContentAt(newPosition, {
              type: "heading",
              attrs: {
                level: 2,
              },
              content: {
                text: delta,
                type: "text",
              },
            });
            this.storage.lastInsertedLength = completion.length;
          }

          return true;
        },
      finishAICompletion: () => () => {
        this.storage.insertPosition = null;
        this.storage.lastInsertedLength = 0;
        return true;
      },
    };
  },
});

// Optimized BubbleMenu component using useEditorState
function OptimizedBubbleMenu({
  editor,
  onRunAIAction,
  status,
}: {
  editor: any;
  onRunAIAction: (action: "explain" | "improve" | "suggest_question") => void;
  status: string;
}) {
  const t = useI18n();
  const [isAIOpen, setIsAIOpen] = useState(false);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        isBold: ctx.editor.isActive("bold") ?? false,
        isItalic: ctx.editor.isActive("italic") ?? false,
        isUnderline: ctx.editor.isActive("underline") ?? false,
        isStrike: ctx.editor.isActive("strike") ?? false,
        isHighlight: ctx.editor.isActive("highlight") ?? false,
        canBold: ctx.editor.can().toggleMark("bold") ?? false,
        canItalic: ctx.editor.can().toggleMark("italic") ?? false,
        canUnderline: ctx.editor.can().toggleMark("underline") ?? false,
        canStrike: ctx.editor.can().toggleMark("strike") ?? false,
        canHighlight: ctx.editor.can().toggleMark("highlight") ?? false,
      };
    },
  });

  if (!editorState) return null;

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center flex-wrap gap-1 p-2 bg-background border rounded-lg shadow-lg max-w-[90vw] overflow-visible"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editorState.canBold}
        className={cn(editorState.isBold && "bg-muted")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editorState.canItalic}
        className={cn(editorState.isItalic && "bg-muted")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editorState.canUnderline}
        className={cn(editorState.isUnderline && "bg-muted")}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editorState.canStrike}
        className={cn(editorState.isStrike && "bg-muted")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        disabled={!editorState.canHighlight}
        className={cn(editorState.isHighlight && "bg-muted")}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </Button>

      {/* AI Menu */}
      <Popover open={isAIOpen} onOpenChange={setIsAIOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={status === "streaming"}
            className={cn(
              "h-8 w-8 p-0",
              status === "streaming" && "animate-pulse",
            )}
            title={t("editor.ai.button")}
          >
            {status === "streaming" ? (
              <Loader2 className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors"
            onClick={() => {
              onRunAIAction("explain");
              setIsAIOpen(false);
            }}
            disabled={status === "streaming"}
          >
            {t("editor.ai.actions.explain")}
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors"
            onClick={() => {
              onRunAIAction("improve");
              setIsAIOpen(false);
            }}
            disabled={status === "streaming"}
          >
            {t("editor.ai.actions.improvements")}
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors"
            onClick={() => {
              onRunAIAction("suggest_question");
              setIsAIOpen(false);
            }}
            disabled={status === "streaming"}
          >
            {t("editor.ai.actions.suggestQuestion")}
          </button>
        </PopoverContent>
      </Popover>
    </BubbleMenu>
  );
}

// Responsive MenuBar component with overflow dropdown
function ResponsiveMenuBar({
  editor,
  onRunAIAction,
  status,
  onFileInput,
  onToggleFullscreen,
  isFullscreen,
  events,
  selectedNews,
  onNewsSelection,
  onEmbedNews,
  date,
}: {
  editor: any;
  onRunAIAction: (action: "explain" | "improve" | "suggest_question") => void;
  status: string;
  onFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  events?: FinancialEvent[];
  selectedNews?: string[];
  onNewsSelection?: (newsIds: string[]) => void;
  onEmbedNews?: (newsIds: string[], action: "add" | "remove") => void;
  date?: Date;
}) {
  const t = useI18n();
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        // Text formatting
        isBold: ctx.editor.isActive("bold") ?? false,
        isItalic: ctx.editor.isActive("italic") ?? false,
        isUnderline: ctx.editor.isActive("underline") ?? false,
        isStrike: ctx.editor.isActive("strike") ?? false,
        isHighlight: ctx.editor.isActive("highlight") ?? false,
        canBold: ctx.editor.can().toggleMark("bold") ?? false,
        canItalic: ctx.editor.can().toggleMark("italic") ?? false,
        canUnderline: ctx.editor.can().toggleMark("underline") ?? false,
        canStrike: ctx.editor.can().toggleMark("strike") ?? false,
        canHighlight: ctx.editor.can().toggleMark("highlight") ?? false,
        // Headings
        isHeading1: ctx.editor.isActive("heading", { level: 1 }) ?? false,
        isHeading2: ctx.editor.isActive("heading", { level: 2 }) ?? false,
        isHeading3: ctx.editor.isActive("heading", { level: 3 }) ?? false,
        canHeading1:
          ctx.editor.can().toggleNode("heading", "paragraph", { level: 1 }) ??
          false,
        canHeading2:
          ctx.editor.can().toggleNode("heading", "paragraph", { level: 2 }) ??
          false,
        canHeading3:
          ctx.editor.can().toggleNode("heading", "paragraph", { level: 3 }) ??
          false,
        // Lists and blocks
        isBulletList: ctx.editor.isActive("bulletList") ?? false,
        isOrderedList: ctx.editor.isActive("orderedList") ?? false,
        isBlockquote: ctx.editor.isActive("blockquote") ?? false,
        canBulletList:
          ctx.editor.can().toggleList("bulletList", "listItem") ?? false,
        canOrderedList:
          ctx.editor.can().toggleList("orderedList", "listItem") ?? false,
        canBlockquote: (ctx.editor.can() as any).toggleBlockquote() ?? false,
        // History
        // Only enable if commands are registered
        canUndo: Boolean((ctx.editor as any).commands?.undo),
        canRedo: Boolean((ctx.editor as any).commands?.redo),
      };
    },
  });

  const [visibleItems, setVisibleItems] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Check for overflow and determine visible items using an offscreen measure row
  useEffect(() => {
    const computeLayout = () => {
      if (!containerRef.current || !measureRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const padding = 16; // p-2
      const dropdownButtonWidth = 48; // reserve space
      const availableWidth = containerWidth - padding - dropdownButtonWidth;

      // Measure children widths from the measurement row
      const itemElements = Array.from(
        measureRef.current.children,
      ) as HTMLElement[];
      if (itemElements.length === 0) return;

      // Total width with 4px gaps
      const totalWidth = itemElements.reduce(
        (acc, el, idx) =>
          acc + el.offsetWidth + (idx < itemElements.length - 1 ? 4 : 0),
        0,
      );

      if (totalWidth <= availableWidth) {
        setShowDropdown(false);
        setVisibleItems(0);
        return;
      }

      // Find visible count that fits
      let running = 0;
      let count = 0;
      for (let i = 0; i < itemElements.length; i++) {
        const w = itemElements[i].offsetWidth;
        const gap = i < itemElements.length - 1 ? 4 : 0;
        if (running + w + gap <= availableWidth) {
          running += w + gap;
          count++;
        } else {
          break;
        }
      }

      if (count >= itemElements.length) {
        setShowDropdown(false);
        setVisibleItems(0);
      } else {
        setShowDropdown(true);
        setVisibleItems(count);
      }
    };

    // Observe size changes reliably
    const ro = new ResizeObserver(() => {
      computeLayout();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    if (measureRef.current) ro.observe(measureRef.current);

    // Also recompute when editor state that affects active styles changes
    computeLayout();
    return () => {
      ro.disconnect();
    };
  }, [
    editorState.isBold,
    editorState.isItalic,
    editorState.isUnderline,
    editorState.isStrike,
    editorState.isHighlight,
    editorState.isHeading1,
    editorState.isHeading2,
    editorState.isHeading3,
    editorState.isBulletList,
    editorState.isOrderedList,
    editorState.isBlockquote,
  ]);

  if (!editorState) return null;

  // Define all menu items
  const allMenuItems = [
    // Text Formatting
    {
      type: "button" as const,
      id: "bold",
      icon: Bold,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editorState.isBold,
      disabled: !editorState.canBold,
    },
    {
      type: "button" as const,
      id: "italic",
      icon: Italic,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editorState.isItalic,
      disabled: !editorState.canItalic,
    },
    {
      type: "button" as const,
      id: "underline",
      icon: UnderlineIcon,
      title: "Underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editorState.isUnderline,
      disabled: !editorState.canUnderline,
    },
    {
      type: "button" as const,
      id: "strike",
      icon: Strikethrough,
      title: "Strikethrough",
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editorState.isStrike,
      disabled: !editorState.canStrike,
    },
    {
      type: "button" as const,
      id: "highlight",
      icon: Highlighter,
      title: "Highlight",
      action: () => editor.chain().focus().toggleHighlight().run(),
      active: editorState.isHighlight,
      disabled: !editorState.canHighlight,
    },

    // Headings
    { type: "separator" as const, id: "heading-sep" },
    {
      type: "button" as const,
      id: "h1",
      icon: Heading1,
      title: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editorState.isHeading1,
      disabled: !editorState.canHeading1,
    },
    {
      type: "button" as const,
      id: "h2",
      icon: Heading2,
      title: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editorState.isHeading2,
      disabled: !editorState.canHeading2,
    },
    {
      type: "button" as const,
      id: "h3",
      icon: Heading3,
      title: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editorState.isHeading3,
      disabled: !editorState.canHeading3,
    },

    // Lists and Blocks
    { type: "separator" as const, id: "list-sep" },
    {
      type: "button" as const,
      id: "bullet",
      icon: List,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editorState.isBulletList,
      disabled: !editorState.canBulletList,
    },
    {
      type: "button" as const,
      id: "ordered",
      icon: ListOrdered,
      title: "Numbered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editorState.isOrderedList,
      disabled: !editorState.canOrderedList,
    },
    {
      type: "button" as const,
      id: "quote",
      icon: Quote,
      title: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editorState.isBlockquote,
      disabled: !editorState.canBlockquote,
    },

    // Actions
    { type: "separator" as const, id: "action-sep" },
    {
      type: "button" as const,
      id: "image",
      icon: ImageIcon,
      title: "Upload Image",
      action: () => document.getElementById("image-upload")?.click(),
      active: false,
      disabled: false,
    },
    // Special AI dropdown trigger (rendered custom below)
    {
      type: "button" as const,
      id: "ai",
      icon: status === "streaming" ? Loader2 : Sparkles,
      title: t("editor.ai.button"),
      action: () => {},
      active: false,
      disabled: false,
    },

    // History
    { type: "separator" as const, id: "history-sep" },
    {
      type: "button" as const,
      id: "undo",
      icon: () => (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      ),
      title: "Undo",
      action: () => editor.chain().focus().undo().run(),
      active: false,
      disabled: !editorState.canUndo,
    },
    {
      type: "button" as const,
      id: "redo",
      icon: () => (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
          />
        </svg>
      ),
      title: "Redo",
      action: () => editor.chain().focus().redo().run(),
      active: false,
      disabled: !editorState.canRedo,
    },
  ];

  const visibleItemsList = showDropdown
    ? allMenuItems.slice(0, visibleItems)
    : allMenuItems;
  const overflowItems = showDropdown ? allMenuItems.slice(visibleItems) : [];

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-between gap-1 p-2 bg-muted/30 border-b min-w-0 overflow-hidden"
    >
      <input
        type="file"
        accept="image/*"
        onChange={onFileInput}
        className="hidden"
        id="image-upload"
      />

      <div
        ref={itemsRef}
        className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden"
      >
        {/* News SubMenu - always visible when events are provided */}
        {events &&
          events.length > 0 &&
          onNewsSelection &&
          onEmbedNews &&
          date && (
            <NewsSubMenu
              events={events}
              selectedNews={selectedNews || []}
              onNewsSelection={onNewsSelection}
              onEmbedNews={onEmbedNews}
              date={date}
              className="shrink-0"
            />
          )}

        {visibleItemsList.map((item, index) => {
          if (item.type === "separator") {
            return (
              <div key={item.id} className="w-px h-6 bg-border mx-1 shrink-0" />
            );
          }

          const IconComponent = item.icon;
          // Custom render for AI dropdown
          if (item.id === "ai") {
            return (
              <DropdownMenu key={item.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={status === "streaming"}
                    className={cn(
                      "shrink-0 h-8 w-8 p-0",
                      item.active && "bg-muted",
                      status === "streaming" && "animate-pulse",
                    )}
                    title={item.title}
                  >
                    {typeof IconComponent === "function" &&
                    IconComponent.name === "" ? (
                      <IconComponent />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-56"
                  sideOffset={4}
                >
                  <DropdownMenuItem
                    onClick={() => onRunAIAction("explain")}
                    disabled={status === "streaming"}
                  >
                    {t("editor.ai.actions.explain")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRunAIAction("improve")}
                    disabled={status === "streaming"}
                  >
                    {t("editor.ai.actions.improvements")}
                  </DropdownMenuItem>
                  <div className="h-px bg-border my-1" />
                  <DropdownMenuItem
                    onClick={() => onRunAIAction("suggest_question")}
                    disabled={status === "streaming"}
                  >
                    {t("editor.ai.actions.suggestQuestion")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={item.action}
              disabled={item.disabled}
              className={cn(
                "shrink-0 h-8 w-8 p-0",
                item.active && "bg-muted",
                item.id === "ai" && status === "streaming" && "animate-pulse",
              )}
              title={item.title}
            >
              {typeof IconComponent === "function" &&
              IconComponent.name === "" ? (
                <IconComponent />
              ) : (
                <IconComponent className="h-4 w-4" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Offscreen measurement row to get stable widths regardless of active styles */}
      <div
        aria-hidden
        className="absolute -left-[9999px] top-0 flex items-center gap-1"
        ref={measureRef}
      >
        {allMenuItems.map((item) => {
          if (item.type === "separator") {
            return (
              <div
                key={`m-${item.id}`}
                className="w-px h-6 bg-border shrink-0"
              />
            );
          }
          const IconComponent = item.icon;
          return (
            <div
              key={`m-${item.id}`}
              className="shrink-0 h-8 w-8 p-0 inline-flex items-center justify-center"
            >
              {typeof IconComponent === "function" &&
              IconComponent.name === "" ? (
                <IconComponent />
              ) : (
                <IconComponent className="h-4 w-4" />
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 ml-2 flex items-center gap-1">
        {showDropdown && overflowItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" sideOffset={4}>
              {overflowItems.map((item) => {
                if (item.type === "separator") {
                  return <div key={item.id} className="h-px bg-border my-1" />;
                }

                const IconComponent = item.icon;
                // Keep overflow rendering, but handle AI as a submenu-like list
                if (item.id === "ai") {
                  return (
                    <div key={item.id}>
                      <DropdownMenuItem
                        onClick={() => onRunAIAction("explain")}
                        disabled={status === "streaming"}
                      >
                        {t("editor.ai.actions.explain")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onRunAIAction("improve")}
                        disabled={status === "streaming"}
                      >
                        {t("editor.ai.actions.improvements")}
                      </DropdownMenuItem>
                      <div className="h-px bg-border my-1" />
                      <DropdownMenuItem
                        onClick={() => onRunAIAction("suggest_question")}
                        disabled={status === "streaming"}
                      >
                        {t("editor.ai.actions.suggestQuestion")}
                      </DropdownMenuItem>
                    </div>
                  );
                }
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={item.action}
                    disabled={item.disabled}
                    className={cn(
                      "flex items-center gap-2",
                      item.active && "bg-muted",
                    )}
                  >
                    {typeof IconComponent === "function" &&
                    IconComponent.name === "" ? (
                      <IconComponent />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                    <span>{item.title}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          className="h-8 w-8 p-0"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

interface TiptapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  height?: string;
  width?: string;
  className?: string;
  events?: FinancialEvent[];
  selectedNews?: string[];
  onNewsSelection?: (newsIds: string[]) => void;
  onEmbedNews?: (newsIds: string[], action: "add" | "remove") => void;
  date?: Date;
  collaboration?: boolean;
}

export function TiptapEditor({
  content = "",
  onChange,
  placeholder = "Start writing...",
  height = "100%",
  width = "100%",
  className,
  events,
  selectedNews,
  onNewsSelection,
  onEmbedNews,
  date,
  collaboration = false,
}: TiptapEditorProps) {
  const t = useI18n();
  const user = useUserStore((state) => state.user);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const locale = useCurrentLocale();

  const editorRef = useRef<any>(null);
  // Prevent initial empty onUpdate from clearing externally provided content
  const isInitializingRef = useRef<boolean>(true);
  // Cache of image hash -> public URL to avoid duplicate uploads
  const imageHashCacheRef = useRef<Map<string, string>>(new Map());

  // Create Y.js document for collaboration
  const [ydoc] = useState(() => new Y.Doc());

  const { completion, complete, isLoading, setCompletion } = useCompletion({
    api: "/api/ai/editor",
    onFinish: () => {
      // Use the editor command to reset completion state
      if (editorRef.current) {
        editorRef.current.commands.finishAICompletion();
      }
    },
    onError: (error) => {
      console.error("Completion error:", error);
      toast.error(t("editor.ai.minCharsError"));
      if (editorRef.current) {
        editorRef.current.commands.finishAICompletion();
      }
    },
    experimental_throttle: 50,
  });

  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      try {
        // Validate file size and type before upload
        if (file.size > MAX_FILE_SIZE) {
          toast.error(
            t("trade-table.imageUploadError", { error: "File too large" }),
          );
          throw new Error("File too large");
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(
            t("trade-table.imageUploadError", {
              error: "Unsupported file type",
            }),
          );
          throw new Error("Unsupported file type");
        }

        // Compute SHA-256 hash of the file for deduplication
        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(digest));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.error(hashHex);

        // If we've already uploaded this exact image in-session, reuse the URL
        const cached = imageHashCacheRef.current.get(hashHex);
        if (cached) {
          return cached;
        }

        // Derive extension from MIME type or fallback to filename/unknown
        const mimeExt = file.type.split("/")[1] || "";
        const nameExt = file.name.includes(".")
          ? file.name.split(".").pop() || ""
          : "";
        const ext = (mimeExt || nameExt || "bin").toLowerCase();

        // Store by stable hash-based path so duplicates across sessions reuse the same object
        const filePath = `${user?.id}/journal/${hashHex}.${ext}`;

        const { error } = await supabase.storage
          .from("trade-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false, // don't overwrite; hash path should be unique
          });

        // If an "already exists" error occurs, reuse the existing public URL
        if (error) {
          if (error.message && error.message.includes("already exists")) {
            const { data: pub } = supabase.storage
              .from("trade-images")
              .getPublicUrl(filePath);
            const url = pub.publicUrl;
            imageHashCacheRef.current.set(hashHex, url);
            return url;
          }
          throw error;
        }

        // On first successful upload, return and cache the public URL
        const { data: pub } = supabase.storage
          .from("trade-images")
          .getPublicUrl(filePath);
        const url = pub.publicUrl;
        imageHashCacheRef.current.set(hashHex, url);
        return url;
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error(
          t("trade-table.imageUploadError", { error: "Upload failed" }),
        );
        throw error;
      }
    },
    [user?.id, t],
  );

  // Handle AI dropdown actions
  const handleRunAIAction = useCallback(
    (action: z.infer<typeof EditorAction>) => {
      if (!editorRef.current) return;
      const selectedText = editorRef.current.state?.doc
        ?.textBetween(
          editorRef.current.state.selection.from,
          editorRef.current.state.selection.to,
          "\n",
        )
        ?.trim();
      const fullText = editorRef.current.getText().trim();
      const targetText =
        selectedText && selectedText.length > 0 ? selectedText : fullText;

      if (
        (!targetText || targetText.length < 10) &&
        action != "suggest_question"
      ) {
        toast.error(t("editor.ai.minCharsError"));
        return;
      }

      // Get insertion position and start AI completion
      const { to } = editorRef.current.state.selection;
      editorRef.current.commands.startAICompletion(to);

      // Clear any previous completion
      setCompletion("");

      // Call complete with the action
      complete(targetText, {
        body: {
          action: action,
        },
      });
    },
    [locale, t, complete, setCompletion],
  );

  // Handle completion streaming using editor command
  useEffect(() => {
    if (!completion || !editorRef.current) {
      return;
    }

    // Use the editor command to update completion
    editorRef.current.commands.updateAICompletion(completion);
  }, [completion]);

  const editor = useEditor({
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      editorRef.current = editor;
      // Set initial content only when collaboration is disabled
      if (!collaboration && content && content !== "") {
        isInitializingRef.current = true;
        editor.commands.setContent(content);
        isInitializingRef.current = false;
      }
    },
    extensions: [
      // StarterKit.configure({
      //   // Disable default undo/redo for collaboration
      //   link: false,
      //   undoRedo: false,
      // }),
      BubbleMenuExtension,
      TextStyleKit,
      Placeholder.configure({
        placeholder: placeholder,
        showOnlyCurrent: false,
        includeChildren: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      // AI Content mark for styling
      AIContentMark,
      // AI Completion extension
      AICompletionExtension,
      // Collaboration extension (optional)
      ...(collaboration ? [Collaboration.configure({ document: ydoc })] : []),
    ],
    // With collaboration enabled, TipTap ignores initial content; keep empty
    content: collaboration ? "" : content,
    onUpdate: ({ editor }) => {
      if (isInitializingRef.current) return;
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-sm xl:prose mx-auto focus:outline-none",
          "h-full p-2",
          // Typography styles
          "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:mt-3 [&_h1]:mb-2",
          "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:mt-5 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-normal [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_p]:my-2 [&_p]:leading-relaxed",
          "[&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-2 [&_ol]:my-2",
          "[&_li]:my-1",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-gray-600",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4 [&_img]:shadow-md",
          "[&_a]:text-blue-500 [&_a]:underline [&_a]:cursor-pointer [&_a]:hover:text-blue-700 [&_a]:transition-colors",
          "[&_table]:border-collapse [&_table]:my-4 [&_table]:w-full",
          "[&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_td]:text-left",
          "[&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:text-left [&_th]:bg-gray-50 [&_th]:font-semibold",
          "[&_.task-list-item]:list-none [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:my-1",
          "[&_.task-list-item_input]:mr-2 [&_.task-list-item_input]:mt-0.5 [&_.task-list-item_input]:flex-shrink-0",
          "[&_.task-list-item_>_div]:flex-1",
          "[&_mark]:bg-yellow-200 [&_mark]:rounded [&_mark]:px-1 [&_mark]:py-0.5",
          "[&_.text-left]:text-left [&_.text-center]:text-center [&_.text-right]:text-right [&_.text-justify]:text-justify",
          "[&_.text-muted-foreground]:text-gray-500 [&_.text-muted-foreground]:italic [&_.text-muted-foreground]:opacity-40",
          // News event styles
          "[&_.news-event]:border-l-4 [&_.news-event]:border-blue-500 [&_.news-event]:pl-4 [&_.news-event]:py-2 [&_.news-event]:my-2 [&_.news-event]:bg-blue-50 [&_.news-event]:dark:bg-blue-950/20 [&_.news-event]:rounded-r-lg",
          // Inline news event styles
          "[&_.news-event-inline]:text-sm [&_.news-event-inline]:text-blue-600 [&_.news-event-inline]:dark:text-blue-400 [&_.news-event-inline]:bg-blue-50 [&_.news-event-inline]:dark:bg-blue-950/20 [&_.news-event-inline]:px-2 [&_.news-event-inline]:py-1 [&_.news-event-inline]:rounded [&_.news-event-inline]:border-l-2 [&_.news-event-inline]:border-blue-500 [&_.news-event-inline]:my-1",
          // Placeholder styles - using CSS custom properties for complex selectors
          "[&_p.is-editor-empty:first-child::before]:text-gray-400 [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          // AI-generated content styles
          "[&_.ai-generated-content]:bg-purple-50 [&_.ai-generated-content]:dark:bg-purple-950/20 [&_.ai-generated-content]:rounded [&_.ai-generated-content]:px-0.5 [&_.ai-generated-content]:animate-in [&_.ai-generated-content]:fade-in-50",
          "[&_h1.is-empty::before]:text-gray-400 [&_h1.is-empty::before]:float-left [&_h1.is-empty::before]:h-0 [&_h1.is-empty::before]:pointer-events-none [&_h1.is-empty::before]:content-[attr(data-placeholder)]",
          "[&_h2.is-empty::before]:text-gray-400 [&_h2.is-empty::before]:float-left [&_h2.is-empty::before]:h-0 [&_h2.is-empty::before]:pointer-events-none [&_h2.is-empty::before]:content-[attr(data-placeholder)]",
          "[&_h3.is-empty::before]:text-gray-400 [&_h3.is-empty::before]:float-left [&_h3.is-empty::before]:h-0 [&_h3.is-empty::before]:pointer-events-none [&_h3.is-empty::before]:content-[attr(data-placeholder)]",
          // Selection styles
          "[&_::selection]:bg-blue-500 [&_::selection]:text-white",
          // Responsive adjustments
          "sm:[&_h1]:text-3xl sm:[&_h2]:text-2xl sm:[&_h3]:text-lg",
          className,
        ),
        style: `height: ${height}; width: ${width};`,
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items || []);

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file && editor) {
              handleImageUpload(file)
                .then((imageUrl) => {
                  editor.chain().focus().setImage({ src: imageUrl }).run();
                })
                .catch((error) => {
                  console.error("Failed to upload pasted image:", error);
                });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);

        for (const file of files) {
          if (file.type.startsWith("image/") && editor) {
            event.preventDefault();
            handleImageUpload(file)
              .then((imageUrl) => {
                editor.chain().focus().setImage({ src: imageUrl }).run();
              })
              .catch((error) => {
                console.error("Failed to upload dropped image:", error);
              });
            return true;
          }
        }
        return false;
      },
    },
  });

  // Handle embedding news into the editor
  const handleEmbedNews = useCallback(
    (newsIds: string[], action: "add" | "remove" = "add") => {
      if (!editor || !events) return;

      if (action === "remove") {
        // Remove news from editor by finding and removing elements with matching data-news-id
        const newsIdsToRemove = newsIds;
        const doc = editor.state.doc;

        // Find all news elements to remove
        const positionsToRemove: { from: number; to: number }[] = [];

        doc.descendants((node, pos) => {
          if (
            node.type.name === "paragraph" &&
            node.attrs &&
            node.attrs["data-news-id"]
          ) {
            const newsId = node.attrs["data-news-id"];
            if (newsIdsToRemove.includes(newsId)) {
              positionsToRemove.push({ from: pos, to: pos + node.nodeSize });
            }
          }
        });

        // Remove elements from end to start to maintain positions
        positionsToRemove.reverse().forEach(({ from, to }) => {
          editor.commands.deleteRange({ from, to });
        });

        return;
      }

      // Add news to editor
      const eventsToAdd = events.filter((event) => newsIds.includes(event.id));
      if (eventsToAdd.length === 0) return;

      // Create inline HTML content for each news event
      const newsHtml = eventsToAdd
        .map((event) => {
          const eventTime = new Date(event.date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          const location = event.country || "Unknown";
          const eventName = event.title;
          const impactLevel = event.importance.toUpperCase();

          return `<p data-news-id="${event.id}" class="news-event-inline text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded border-l-2 border-blue-500 my-1">${eventTime} - ${location} - ${eventName} - ${impactLevel}</p>`;
        })
        .join("");

      // Insert the news content at the current cursor position
      // Insert without focusing the editor to avoid closing popovers
      editor.commands.insertContent(newsHtml);
    },
    [editor, events],
  );

  // Update editor content when content prop changes (only when not collaborating)
  useEffect(() => {
    if (!collaboration && editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Update if content is different, or if we're setting content for the first time (empty editor)
      if (
        content !== currentContent &&
        (content !== "" ||
          currentContent === "<p></p>" ||
          currentContent === "")
      ) {
        isInitializingRef.current = true;
        editor.commands.setContent(content);
        isInitializingRef.current = false;
      }
    }
  }, [collaboration, editor, content]);

  // Handle file input for image upload
  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/") && editor) {
        handleImageUpload(file)
          .then((imageUrl) => {
            editor.chain().focus().setImage({ src: imageUrl }).run();
          })
          .catch((error) => {
            console.error("Failed to upload image:", error);
          });
      }
    },
    [editor, handleImageUpload],
  );

  if (!editor) {
    return null;
  }

  const editorHeight = isFullscreen ? "calc(100vh - 48px)" : height;

  return (
    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <DialogTitle hidden>Editor</DialogTitle>
      {!isFullscreen && (
        <div className="border rounded-lg overflow-hidden bg-background relative h-full flex flex-col">
          {/* MenuBar */}
          <ResponsiveMenuBar
            editor={editor}
            onRunAIAction={handleRunAIAction}
            status={isLoading ? "streaming" : "ready"}
            onFileInput={handleFileInput}
            onToggleFullscreen={() => setIsFullscreen(true)}
            isFullscreen={false}
            events={events}
            selectedNews={selectedNews}
            onNewsSelection={onNewsSelection}
            onEmbedNews={onEmbedNews || handleEmbedNews}
            date={date}
          />

          {/* Editor Content */}
          <div className="relative flex-1 min-h-0">
            <EditorContent
              editor={editor}
              className="h-full focus-within:outline-hidden overflow-y-auto"
              style={{ height: editorHeight, width }}
            />

            {/* Optimized Bubble Menu - appears when text is selected */}
            <OptimizedBubbleMenu
              editor={editor}
              onRunAIAction={handleRunAIAction}
              status={isLoading ? "streaming" : "ready"}
            />
          </div>
        </div>
      )}

      {isFullscreen && (
        <DialogContent className="w-screen h-screen max-w-none p-0 sm:rounded-none z-9999">
          <div className="flex flex-col h-full bg-background">
            <ResponsiveMenuBar
              editor={editor}
              onRunAIAction={handleRunAIAction}
              status={isLoading ? "streaming" : "ready"}
              onFileInput={handleFileInput}
              onToggleFullscreen={() => setIsFullscreen(false)}
              isFullscreen={true}
              events={events}
              selectedNews={selectedNews}
              onNewsSelection={onNewsSelection}
              onEmbedNews={onEmbedNews || handleEmbedNews}
              date={date}
            />
            <div className="relative flex-1 min-h-0">
              <EditorContent
                editor={editor}
                className="focus-within:outline-hidden overflow-y-auto h-full"
                style={{ height: editorHeight, width: "100%" }}
              />
              <OptimizedBubbleMenu
                editor={editor}
                onRunAIAction={handleRunAIAction}
                status={isLoading ? "streaming" : "ready"}
              />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
