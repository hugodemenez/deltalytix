import { cn } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, UnderlineIcon, Strikethrough, Highlighter, Loader2, Sparkles, Table2, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BubbleMenu } from "@tiptap/react/menus";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Optimized BubbleMenu component using useEditorState
export function OptimizedBubbleMenu({
  editor,
  onRunAIAction,
  status,
}: {
  editor: Editor;
  onRunAIAction: (action: "explain" | "improve" | "suggest_question") => void;
  status: string;
}) {
  const t = useI18n();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);

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
        isTable: ctx.editor.isActive("table") ?? false,
        canAddColumn: ctx.editor.can().addColumnAfter() ?? false,
        canAddRow: ctx.editor.can().addRowAfter() ?? false,
        canDeleteColumn: ctx.editor.can().deleteColumn() ?? false,
        canDeleteRow: ctx.editor.can().deleteRow() ?? false,
        canDeleteTable: ctx.editor.can().deleteTable() ?? false,
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

      {/* Table Menu - Show when inside a table */}
      {editorState.isTable && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Popover open={isTableMenuOpen} onOpenChange={setIsTableMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Table Options"
              >
                <Table2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                onClick={() => {
                  editor.chain().focus().addColumnBefore().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canAddColumn}
              >
                <Plus className="h-4 w-4" />
                Add Column Before
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                onClick={() => {
                  editor.chain().focus().addColumnAfter().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canAddColumn}
              >
                <Plus className="h-4 w-4" />
                Add Column After
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                onClick={() => {
                  editor.chain().focus().addRowBefore().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canAddRow}
              >
                <Plus className="h-4 w-4" />
                Add Row Before
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2"
                onClick={() => {
                  editor.chain().focus().addRowAfter().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canAddRow}
              >
                <Plus className="h-4 w-4" />
                Add Row After
              </button>
              <div className="h-px bg-border my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 text-destructive"
                onClick={() => {
                  editor.chain().focus().deleteColumn().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canDeleteColumn}
              >
                <Trash2 className="h-4 w-4" />
                Delete Column
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 text-destructive"
                onClick={() => {
                  editor.chain().focus().deleteRow().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canDeleteRow}
              >
                <Trash2 className="h-4 w-4" />
                Delete Row
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 text-destructive"
                onClick={() => {
                  editor.chain().focus().deleteTable().run();
                  setIsTableMenuOpen(false);
                }}
                disabled={!editorState.canDeleteTable}
              >
                <Trash2 className="h-4 w-4" />
                Delete Table
              </button>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* AI Menu */}
      <div className="w-px h-6 bg-border mx-1" />
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
