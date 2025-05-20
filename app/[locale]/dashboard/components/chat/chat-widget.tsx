'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Camera, Folder, Send, RotateCcw, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useUserData } from '@/components/context/user-data';
import { getMoodForDay, saveMood } from '@/server/journal';
import { generateId } from 'ai';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { Trade as PrismaTrade } from '@prisma/client';
import { useI18n } from "@/locales/client";
import { debounce } from 'lodash';
import { WidgetSize } from '../../types/dashboard';

// Types
type MoodType = 'bad' | 'okay' | 'great';

interface SavedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MoodHistoryEntry {
  date: string;
  mood: string;
  conversation: SavedMessage[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | React.ReactNode;
  animate: boolean;
}

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

function useScrollControl() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const lastScrollTopRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior
        });
      }
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollArea = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = scrollArea;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScrolling(isAtBottom);
    setShowScrollButton(!isAtBottom);
    lastScrollTopRef.current = scrollTop;
  }, []);

  return {
    scrollAreaRef,
    showScrollButton,
    isAutoScrolling,
    scrollToBottom,
    handleScroll
  };
}

function useChatStreaming(todayTrades: PrismaTrade[], weekTrades: PrismaTrade[], monthTrades: PrismaTrade[], userMoodHistory: MoodHistoryEntry[] | undefined) {
  const { user } = useUserData();
  const [isLoading, setIsLoading] = useState(false);

  const streamChat = useCallback(async ({
    input, 
    conversationHistory = [], 
    isInitialGreeting = false,
    onChunkReceived,
    onComplete,
    onError
  }: {
    input?: string;
    conversationHistory?: SavedMessage[];
    isInitialGreeting?: boolean;
    onChunkReceived: (chunk: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
  }) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          todayTrades,
          weekTrades,
          monthTrades,
          conversationHistory,
          userMoodHistory,
          isInitialGreeting,
          username: user?.user_metadata?.full_name || user?.email?.split('@')[0]
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      console.log('Response:', response);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              fullText += data.content;
              onChunkReceived(fullText);
            }
          }
        }
      }
      
      onComplete(fullText);
    } catch (error) {
      console.error('Error in chat streaming:', error);
      onError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [todayTrades, weekTrades, monthTrades, userMoodHistory, user]);

  return { streamChat, isLoading };
}

function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useUserData();
  const initRef = useRef(false);
  const [hasInitializedChat, setHasInitializedChat] = useState(false);

  // Debounced save conversation function
  const debouncedSaveConversation = useCallback(
    async (userId: string, messages: Message[]) => {
      try {
        const conversationToSave = messages.map(msg => ({
          role: msg.role,
          content: extractTextContent(msg.content)
        }));

        const dateKey = format(new Date(), 'yyyy-MM-dd');
        const todayMood = await getMoodForDay(dateKey);
        const currentMood = todayMood?.mood as MoodType || 'okay';
        
        await saveMood(currentMood, conversationToSave);
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    },
    []
  );

  const debouncedSave = useMemo(
    () => debounce(debouncedSaveConversation, 1000),
    [debouncedSaveConversation]
  );

  // Save conversation with debounce, but only for non-initial messages
  useEffect(() => {
    if (!user?.id || messages.length === 0 || !hasInitializedChat || messages.length === 1) return;
    debouncedSave(user.id, messages);
    
    return () => {
      debouncedSave.cancel();
    };
  }, [messages, user?.id, debouncedSave, hasInitializedChat]);

  const addUserMessage = useCallback((text: string) => {
    const newMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      animate: true
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const addAssistantMessage = useCallback((text: string, messageId = generateId()) => {
    setMessages(prev => {
      const existingMessage = prev.find(m => m.id === messageId);
      if (existingMessage) {
        return prev.map(m => 
          m.id === messageId ? { ...m, content: text, animate: false } : m
        );
      }
      return [...prev, {
        id: messageId,
        role: 'assistant',
        content: text,
        animate: false
      }];
    });
    return messageId;
  }, []);

  const resetMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  return {
    messages,
    hasInitializedChat,
    setHasInitializedChat,
    addUserMessage,
    addAssistantMessage,
    resetMessages,
    debouncedSave,
    initRef
  };
}

// Components
const SystemMessage = React.memo(({ content }: { content: string | React.ReactNode }) => {
  return (
    <div className="flex w-full mb-3 last:mb-20">
      <div className="max-w-[80%] overflow-hidden">
        <div className="p-3 rounded-lg break-words overflow-hidden bg-muted/50 text-muted-foreground border border-muted">
          <div className="text-pretty">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
});

SystemMessage.displayName = 'SystemMessage';

const UserMessage = React.memo(({ content, animate }: { content: string | React.ReactNode; animate: boolean }) => {
  return (
    <motion.div 
      className="flex w-full mb-3 last:mb-20"
      {...(animate ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3, ease: "easeOut" }
      } : {})}
      layout
    >
      <motion.div
        className="max-w-[80%] overflow-hidden ml-auto"
        {...(animate ? {
          initial: { scale: 0.95 },
          animate: { scale: 1 },
          transition: { duration: 0.2 }
        } : {})}
      >
        <div className="p-3 rounded-lg break-words overflow-hidden bg-primary text-primary-foreground">
          <div className="text-pretty">
            {content}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

UserMessage.displayName = 'UserMessage';

const MessageItem = React.memo(({ message }: { message: Message }) => {
  switch (message.role) {
    case 'system':
    case 'assistant':
      return <SystemMessage content={message.content} />;
    case 'user':
      return <UserMessage content={message.content} animate={message.animate} />;
    default:
      return null;
  }
});

MessageItem.displayName = 'MessageItem';

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
  isLoading,
  showScrollButton,
  onScrollToBottom,
  t
}: { 
  onSend: (text: string) => void; 
  isLoading: boolean;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
  t: ReturnType<typeof useI18n>;
}) => {
  const [input, setInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (type: 'camera' | 'photo' | 'folder') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'camera' ? 'image/*;capture=camera' : 'image/*';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-sm">
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute -top-12 right-4 h-8 w-8 rounded-full shadow-md hover:shadow-lg transition-all"
          onClick={onScrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            onSend(input);
            setInput('');
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
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-0">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleFileUpload('camera')}
              disabled={isLoading}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t('chat.camera')}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleFileUpload('folder')}
              disabled={isLoading}
            >
              <Folder className="mr-2 h-4 w-4" />
              {t('chat.folder')}
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? t('chat.aiThinking') : t('chat.writeMessage')}
          className="flex-grow bg-background/50"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          size="icon" 
          className="shrink-0"
          disabled={isLoading || !input.trim()}
        >
          <Send className={cn("h-4 w-4", isLoading && "animate-pulse")} />
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
  const { user, moodHistory: rawMoodHistory } = useUserData();
  const { todayTrades, weekTrades, monthTrades } = useTradeData();
  const t = useI18n();
  const { 
    messages, 
    hasInitializedChat, 
    setHasInitializedChat,
    addUserMessage, 
    addAssistantMessage, 
    resetMessages,
    debouncedSave,
    initRef 
  } = useChatMessages();
  const { 
    scrollAreaRef, 
    showScrollButton, 
    isAutoScrolling, 
    scrollToBottom, 
    handleScroll 
  } = useScrollControl();
  
  // Transform rawMoodHistory to MoodHistoryEntry[] for the chat API
  const moodHistory = useMemo(() => {
    if (!rawMoodHistory) return undefined;
    return rawMoodHistory.map(moodEntry => ({
      date: format(new Date(moodEntry.day), 'yyyy-MM-dd'), // Format date
      mood: moodEntry.mood,
      // Assuming moodEntry.conversation is already an array of SavedMessage compatible objects
      // If Prisma returns a JSON string, it might need JSON.parse here.
      // If it's a generic JsonValue, ensure it fits SavedMessage[] structure.
      conversation: (moodEntry.conversation as unknown as SavedMessage[] || []) 
    })).slice(-5); // Send last 5 mood history entries, adjust as needed
  }, [rawMoodHistory]);

  const { streamChat, isLoading } = useChatStreaming(todayTrades, weekTrades, monthTrades, moodHistory);

  // Initialize chat data
  const initializeChat = useCallback(async () => {
    if (!user?.id || initRef.current) return;
    initRef.current = true;

    try {
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      const todayMood = await getMoodForDay(dateKey);
      
      if (todayMood?.conversation) {
        const savedMessages = (todayMood.conversation as SavedMessage[]);
        resetMessages(savedMessages.map(msg => ({
          id: generateId(),
          role: msg.role,
          content: msg.content,
          animate: false
        })));
      } else {
        await streamChat({
          isInitialGreeting: true,
          onChunkReceived: (text) => {
            addAssistantMessage(text);
          },
          onComplete: async (fullText) => {
            // Save initial greeting
            await saveMood('okay', [{
              role: 'assistant',
              content: fullText
            }]);
          },
          onError: (error) => {
            console.error('Error initializing chat:', error);
            addAssistantMessage('Sorry, I encountered an error. Please try again.');
          }
        });
      }
      setHasInitializedChat(true);
    } catch (error) {
      console.error('Error initializing chat:', error);
      initRef.current = false; // Allow retry on error
    }
  }, [user?.id, streamChat, addAssistantMessage, resetMessages, setHasInitializedChat, initRef]);

  // Auto-scroll when new messages arrive or during streaming
  useEffect(() => {
    if (isAutoScrolling) {
      scrollToBottom();
    }
  }, [messages, isAutoScrolling, scrollToBottom]);

  // Load initial conversation only once when user is available
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (text.trim() === '' || isLoading) return;

    addUserMessage(text);
    
    const messageId = generateId();
    await streamChat({
      input: text,
      conversationHistory: messages.map(msg => ({
        role: msg.role,
        content: extractTextContent(msg.content)
      })),
      onChunkReceived: (text) => {
        addAssistantMessage(text, messageId);
      },
      onComplete: () => {},
      onError: () => {
        addAssistantMessage('Sorry, I encountered an error. Please try again.');
      }
    });
  }, [isLoading, messages, streamChat, addUserMessage, addAssistantMessage]);

  const resetConversation = useCallback(async () => {
    if (!user?.id) return;
    
    await streamChat({
      isInitialGreeting: true,
      onChunkReceived: (text) => {
        resetMessages([{
          id: generateId(),
          role: 'assistant',
          content: text,
          animate: false
        }]);
      },
      onComplete: async (fullText) => {
        // Save the reset conversation immediately
        await debouncedSave.cancel();
        await saveMood('okay', [{
          role: 'assistant',
          content: fullText
        }]);
      },
      onError: (error) => {
        console.error('Error resetting conversation:', error);
        resetMessages([{
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          animate: false
        }]);
      }
    });
  }, [user?.id, streamChat, resetMessages, debouncedSave]);

  return (
    <Card className="h-full flex flex-col bg-background">
      <ChatHeader 
        title={t('chat.title')}
        onReset={resetConversation}
        isLoading={isLoading}
        size={size}
      />
      <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative overflow-hidden">
        <ScrollArea 
          className="flex-1 min-h-0 w-full" 
          ref={scrollAreaRef}
          style={{ overscrollBehavior: 'contain' }}
          onScroll={handleScroll}
        >
          <div 
            className="flex-1 overflow-y-auto p-4"
            data-scrollable="true"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        <ChatInput 
          onSend={handleSendMessage}
          isLoading={isLoading}
          showScrollButton={showScrollButton}
          onScrollToBottom={() => {
            scrollToBottom();
            // Re-enable auto-scrolling when user clicks the button
            setTimeout(() => scrollToBottom(), 100);
          }}
          t={t}
        />
      </CardContent>
    </Card>
  );
} 