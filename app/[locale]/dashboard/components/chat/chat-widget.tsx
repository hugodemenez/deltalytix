'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Camera, Folder, Send, RotateCcw, ChevronDown, StopCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useUserData } from '@/components/context/user-data';
import { getMoodForDay, saveMood } from '@/server/journal';
import { generateId, UIMessage } from 'ai';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { Trade as PrismaTrade } from '@prisma/client';
import { useCurrentLocale, useI18n } from "@/locales/client";
import { debounce } from 'lodash';
import { WidgetSize } from '../../types/dashboard';
import { useChat } from '@ai-sdk/react';
import { ToolInvocation } from 'ai';
import ReactMarkdown from 'react-markdown';

// Types



interface ChatWidgetProps {
  size?: WidgetSize;
}

// Utility functions
function extractTextContent(content: string | React.ReactNode): string {
  if (typeof content === 'string') return content;

  if (React.isValidElement(content)) {
    const element = content as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children) {
      return String(element.props.children);
    }
  }
  return String(content);
}

function filterTrades(trades: PrismaTrade[], interval: { start: Date, end: Date }) {
  return trades.filter(trade => {
    const tradeDate = new Date(trade.entryDate);
    return isWithinInterval(tradeDate, interval);
  });
}

// Custom hooks
function useTradeData() {
  const { trades } = useUserData();

  return useMemo(() => {
    if (!trades) return { todayTrades: [], weekTrades: [], monthTrades: [] };

    const today = new Date();
    const todayTrades = filterTrades(trades, {
      start: startOfDay(today),
      end: endOfDay(today)
    });

    const weekTrades = filterTrades(trades, {
      start: startOfWeek(today),
      end: endOfWeek(today)
    });

    const monthTrades = filterTrades(trades, {
      start: startOfMonth(today),
      end: endOfMonth(today)
    });

    return { todayTrades, weekTrades, monthTrades };
  }, [trades]);
}

// Components
export function SystemMessage({ children }: { children: React.ReactNode }) {
  console.log(children)
  const content = typeof children === 'string' ? (
    <ReactMarkdown>
      {children}
    </ReactMarkdown>
  ) : children;

  return (
    <div className="flex w-full mb-3 last:mb-20">
      <div className="text-pretty break-words max-w-[90%] bg-muted/50 p-4 rounded-lg rounded-tl-none border border-muted">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content}
        </div>
      </div>
    </div>
  );
}

export function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex w-full mb-3 last:mb-20"
      {... {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      layout
    >
      <motion.div
        className="max-w-[80%] overflow-hidden ml-auto"
        {... {
          initial: { scale: 0.95 },
          animate: { scale: 1 },
          transition: { duration: 0.2 }
        }}
      >
        <div className="p-3 rounded-lg rounded-br-none break-words overflow-hidden bg-primary text-primary-foreground">
          <div className="text-pretty">
            {children}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const ChatHeader = ({ title, onReset, isLoading, size }: {
  title: string;
  onReset: () => void;
  isLoading: boolean;
  size?: WidgetSize;
}) => (
  <CardHeader
    className={cn(
      "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
      size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
    )}
  >
    <div className="flex items-center gap-1.5">
      <CardTitle
        className={cn(
          "line-clamp-1",
          size === 'small-long' ? "text-sm" : "text-base"
        )}
      >
        {title}
      </CardTitle>
    </div>
    <Button
      variant="ghost"
      size="icon"
      onClick={onReset}
      disabled={isLoading}
      className={cn(
        "shrink-0",
        size === 'small-long' ? "h-7 w-7" : "h-8 w-8"
      )}
      title={title}
    >
      <RotateCcw className={cn(
        size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
      )} />
    </Button>
  </CardHeader>
);

const ChatInput = ({
  onSend,
  status,
  input,
  handleInputChange,
  stop
}: {
  onSend: (e?: { preventDefault?: () => void }) => void;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  stop: () => void;
}) => {
  const t = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (type: 'camera' | 'photo' | 'folder') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'camera' ? 'image/*;capture=camera' : 'image/*';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            onSend(e);
          }
        }}
        className="flex items-center space-x-2"
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={status === 'streaming'}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-0">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleFileUpload('camera')}
              disabled={status === 'streaming'}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t('chat.camera')}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleFileUpload('folder')}
              disabled={status === 'streaming'}
            >
              <Folder className="mr-2 h-4 w-4" />
              {t('chat.folder')}
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={status === 'streaming' ? t('chat.aiThinking') : t('chat.writeMessage')}
          className="flex-grow bg-background/50"
          disabled={status === 'streaming'}
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0"
          disabled={status === 'streaming' || !input.trim()}
        >
          <Send className={cn("h-4 w-4", status === 'streaming' && "animate-pulse")} />
        </Button>
        <Button
          type="button"
          size="icon"
          className="shrink-0"
          disabled={status !== 'streaming'}
          onClick={stop}
        >
          <StopCircle className={cn("h-4 w-4", status === 'streaming' && "animate-pulse")} />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
        />
      </form>
    </div>
  );
};

// Main Component
export default function ChatWidget({ size = 'large' }: ChatWidgetProps) {
  const { user } = useUserData();
  const t = useI18n();
  const locale = useCurrentLocale();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, status, stop, setMessages, addToolResult, error, reload } = useChat({
    body: {
      username: user?.user_metadata?.full_name || user?.email?.split('@')[0],
      locale: locale
    },
    experimental_throttle: 100
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleReset = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return (
    <Card className="h-full flex flex-col bg-background">
      <ChatHeader
        title={t('chat.title')}
        onReset={handleReset}
        isLoading={status === 'streaming'}
        size={size}
      />
      <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative overflow-hidden">
        <ScrollArea
          className="flex-1 min-h-0 w-full pb-20"
          style={{ overscrollBehavior: 'contain' }}
          ref={scrollAreaRef}
        >
          <AnimatePresence mode="popLayout">
            {error && (
              <div className="p-3 rounded-lg break-words overflow-hidden bg-muted/50 text-muted-foreground border border-muted">
                An error occurred.
                <Button type="button" onClick={() => reload()} className="ml-2">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
            <div className='p-4'>
              {messages.map(message => {
                switch (message.role) {
                  case 'user':
                    return <UserMessage key={message.id}>{message.content}</UserMessage>
                  case 'assistant':
                    return <SystemMessage key={message.id}>{message.content}</SystemMessage>
                  default:
                    message.parts?.map((part, index) => {
                      switch (part.type) {
                        case 'text':
                          return <SystemMessage key={message.id}>{part.text}</SystemMessage>
                        case 'tool-invocation': {
                          const callId = part.toolInvocation.toolCallId;
                          switch (part.toolInvocation.toolName) {
                            case 'askForConfirmation': {
                              switch (part.toolInvocation.state) {
                                case 'partial-call':
                                  return (
                                    <SystemMessage key={`${callId}-partial-call`}>
                                      {part.toolInvocation.args?.message}
                                    </SystemMessage>
                                  );
                                case 'call':
                                  return (
                                    <SystemMessage key={`${callId}-call`}>
                                      {part.toolInvocation.args?.message}
                                      <div className="flex gap-2 mt-2">
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            addToolResult({
                                              toolCallId: callId,
                                              result: 'Yes, confirmed.',
                                            })
                                          }
                                        >
                                          Yes
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            addToolResult({
                                              toolCallId: callId,
                                              result: 'No, denied',
                                            })
                                          }
                                        >
                                          No
                                        </Button>
                                      </div>
                                    </SystemMessage>
                                  );
                                case 'result':
                                  return (
                                    <SystemMessage key={`${callId}-result`}>
                                      Response: {part.toolInvocation.result}
                                    </SystemMessage>
                                  );
                              }
                            }
                            default:
                              return null;
                          }
                        }
                        default:
                          return null;
                      }
                    })
                }
              }
              )}
            </div>
          </AnimatePresence>
        </ScrollArea>
        <ChatInput
          onSend={handleSubmit}
          status={status}
          stop={stop}
          input={input}
          handleInputChange={handleInputChange}
        />
      </CardContent>
    </Card>
  );
} 