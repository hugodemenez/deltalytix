"use client";

import { useEditor, EditorContent } from "@tiptap/react";

// Declare custom TipTap commands for TypeScript
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiCompletion: {
      startAICompletion: (position: number) => ReturnType;
      updateAICompletion: (completion: string) => ReturnType;
      finishAICompletion: () => ReturnType;
    };
  }
}
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { BubbleMenu as BubbleMenuExtension } from "@tiptap/extension-bubble-menu";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useState, useEffect, useRef } from "react";
import { useUserStore } from "@/store/user-store";
import { toast } from "sonner";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useCompletion } from "@ai-sdk/react";
import { FinancialEvent } from "@prisma/client";
import { z } from "zod";
import { OptimizedBubbleMenu } from "@/components/tiptap/optimized-bubble-menu";
import { ResponsiveMenuBar } from "@/components/tiptap/menu-bar";
import { ActionSchema as EditorAction } from "@/app/api/ai/editor/schema";
import { useIsMobile } from "@/hooks/use-mobile";

const supabase = createClient();

// AI Completion Extension to manage streaming state
const AICompletionExtension = Extension.create({
  name: "aiCompletion",

  addStorage() {
    return {
      insertPosition: null as number | null,
      lastInsertedLength: 0,
    };
  },

  addCommands() {
    return {
      startAICompletion:
        (position: number) =>
        ({ commands }) => {
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
              text: delta,
              type: "text",
            });
            this.storage.lastInsertedLength = completion.length;
          }
          return true;
        },
      finishAICompletion:
        () =>
        ({ commands }) => {
          this.storage.insertPosition = null;
          this.storage.lastInsertedLength = 0;
          return true;
        },
    };
  },
});

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
  const isMobile = useIsMobile();

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
      StarterKit.configure({
        // Disable default undo/redo for collaboration
        link: false,
        undoRedo: false,
      }),
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
          // Selection styles with visible caret
          "[&_::selection]:bg-blue-500 [&_::selection]:text-white",
          "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-blue-500",
          // Responsive adjustments
          "sm:[&_h1]:text-3xl sm:[&_h2]:text-2xl sm:[&_h3]:text-lg",
          className,
        ),
        style: `height: ${height}; width: ${width};`,
        // Ensure caret is visible on mobile
        "data-gramm": "false",
        "data-gramm_editor": "false",
        "data-enable-grammarly": "false",
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

  // Handle caret visibility on mobile - scroll to keep caret in view
  useEffect(() => {
    if (!editor || !isMobile) return;

    const handleSelectionUpdate = () => {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        const selection = editor.view.state.selection;
        const coords = editor.view.coordsAtPos(selection.from);
        
        // Get the editor container
        const editorElement = editor.view.dom.closest('.overflow-y-auto');
        if (!editorElement) return;

        const containerRect = editorElement.getBoundingClientRect();
        const caretTop = coords.top;
        const caretBottom = coords.bottom;

        // Check if caret is outside visible area
        const isAboveView = caretTop < containerRect.top + 20; // 20px buffer
        const isBelowView = caretBottom > containerRect.bottom - 20;

        if (isAboveView || isBelowView) {
          // Scroll the caret into view with smooth behavior
          const caretElement = editor.view.dom.querySelector('.ProseMirror-gapcursor, [data-tippy-root]');
          if (caretElement) {
            caretElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          } else {
            // Fallback: scroll to the selection position
            editor.view.dom.querySelector('p, h1, h2, h3')?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
      });
    };

    // Listen to selection updates
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, isMobile]);

  if (!editor) {
    return null;
  }

  // In fullscreen mode, account for menu bar height (48px)
  // On mobile, menu is at bottom; on desktop, menu is at top
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
        <DialogContent className="w-screen h-screen max-w-none p-0 sm:rounded-none z-9999 [&>button]:hidden">
          <div className="flex flex-col h-full bg-background">
            {/* Menu bar at top on desktop, bottom on mobile */}
            {!isMobile && (
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
            )}
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
            {/* Menu bar at bottom on mobile for better reachability */}
            {isMobile && (
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
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
