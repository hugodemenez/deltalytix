import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { FinancialEvent } from "@/prisma/generated/prisma/browser";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Heading1, Heading2, Heading3, List, ListOrdered, Quote, ImageIcon, Loader2, Sparkles, MoreHorizontal, Minimize2, Maximize2, Table2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NewsSubMenu } from "@/components/ai-elements/news-sub-menu";
import z from "zod";
import { ActionSchema as EditorAction } from "@/app/api/ai/editor/schema";

// Responsive MenuBar component with overflow dropdown
export function ResponsiveMenuBar({
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
  editor: Editor;
  onRunAIAction: (action: z.infer<typeof EditorAction>) => void;
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
        // Table
        isTable: ctx.editor.isActive("table") ?? false,
        canInsertTable: ctx.editor.can().insertTable() ?? false,
        // Image
        isImage: ctx.editor.isActive("image") ?? false,
        // Alignment
        isAlignLeft: ctx.editor.isActive({ textAlign: 'left' }) ?? false,
        isAlignCenter: ctx.editor.isActive({ textAlign: 'center' }) ?? false,
        isAlignRight: ctx.editor.isActive({ textAlign: 'right' }) ?? false,
        canSetAlignment: ctx.editor.can().setTextAlign('left') ?? false,
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
    editorState.isTable,
    editorState.isAlignLeft,
    editorState.isAlignCenter,
    editorState.isAlignRight,
  ]);

  if (!editorState) return null;

  // Define all menu items
  const allMenuItems = [
    // // Text Formatting
    // {
    //   type: "button" as const,
    //   id: "bold",
    //   icon: Bold,
    //   title: "Bold",
    //   action: () => editor.chain().focus().toggleBold().run(),
    //   active: editorState.isBold,
    //   disabled: !editorState.canBold,
    // },
    // {
    //   type: "button" as const,
    //   id: "italic",
    //   icon: Italic,
    //   title: "Italic",
    //   action: () => editor.chain().focus().toggleItalic().run(),
    //   active: editorState.isItalic,
    //   disabled: !editorState.canItalic,
    // },
    // {
    //   type: "button" as const,
    //   id: "underline",
    //   icon: UnderlineIcon,
    //   title: "Underline",
    //   action: () => editor.chain().focus().toggleUnderline().run(),
    //   active: editorState.isUnderline,
    //   disabled: !editorState.canUnderline,
    // },
    // {
    //   type: "button" as const,
    //   id: "strike",
    //   icon: Strikethrough,
    //   title: "Strikethrough",
    //   action: () => editor.chain().focus().toggleStrike().run(),
    //   active: editorState.isStrike,
    //   disabled: !editorState.canStrike,
    // },
    // {
    //   type: "button" as const,
    //   id: "highlight",
    //   icon: Highlighter,
    //   title: "Highlight",
    //   action: () => editor.chain().focus().toggleHighlight().run(),
    //   active: editorState.isHighlight,
    //   disabled: !editorState.canHighlight,
    // },

    // // Headings
    // { type: "separator" as const, id: "heading-sep" },
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
    {
      type: "button" as const,
      id: "table",
      icon: Table2,
      title: "Insert Table",
      action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      active: editorState.isTable,
      disabled: !editorState.canInsertTable,
    },
    // Alignment buttons
    { type: "separator" as const, id: "align-sep" },
    {
      type: "button" as const,
      id: "align-left",
      icon: AlignLeft,
      title: "Align Left",
      action: () => editor.chain().focus().setTextAlign('left').run(),
      active: editorState.isAlignLeft,
      disabled: !editorState.canSetAlignment,
    },
    {
      type: "button" as const,
      id: "align-center",
      icon: AlignCenter,
      title: "Align Center",
      action: () => editor.chain().focus().setTextAlign('center').run(),
      active: editorState.isAlignCenter,
      disabled: !editorState.canSetAlignment,
    },
    {
      type: "button" as const,
      id: "align-right",
      icon: AlignRight,
      title: "Align Right",
      action: () => editor.chain().focus().setTextAlign('right').run(),
      active: editorState.isAlignRight,
      disabled: !editorState.canSetAlignment,
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

        {visibleItemsList.map((item) => {
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
                  <DropdownMenuItem
                    onClick={() => onRunAIAction("trades_summary")}
                    disabled={status === "streaming"}
                  >
                    {t("editor.ai.actions.tradesSummary")}
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
