'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Camera, Folder, Send, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { getInitialGreeting, continueWidgetConversation } from '@/server/chat-widget-actions';
import { useUser } from '@/components/context/user-data';
import { useTrades } from '@/components/context/trades-data';
import { getMoodForDay, saveMood } from '@/server/mood';
import { generateId } from 'ai';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Trade as PrismaTrade } from '@prisma/client';
import { useI18n } from "@/locales/client";
import { debounce } from 'lodash';

type MoodType = 'bad' | 'okay' | 'great';

interface SavedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | React.ReactNode;
}

interface ChatWidgetProps {
  size?: 'tiny' | 'small' | 'small-long' | 'medium' | 'large';
}

function extractTextContent(content: string | React.ReactNode): string {
  if (typeof content === 'string') return content;
  
  // If it's a React element created by our AI response
  if (React.isValidElement(content)) {
    const element = content as React.ReactElement;
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

export default function ChatWidget({ size = 'medium' }: ChatWidgetProps) {
  const { user } = useUser();
  const { trades } = useTrades();
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const t = useI18n();
  const initRef = useRef(false);
  const [hasInitializedChat, setHasInitializedChat] = useState(false);

  const todayTrades = useMemo(() => {
    if (!trades) return [];
    const today = new Date();
    return filterTrades(trades, {
      start: startOfDay(today),
      end: endOfDay(today)
    });
  }, [trades]);

  const weekTrades = useMemo(() => {
    if (!trades) return [];
    const today = new Date();
    return filterTrades(trades, {
      start: startOfWeek(today),
      end: endOfWeek(today)
    });
  }, [trades]);

  // Debounced save conversation function
  const debouncedSaveConversation = useCallback(
    debounce(async (userId: string, messages: Message[]) => {
      try {
        const conversationToSave = messages.map(msg => ({
          role: msg.role,
          content: extractTextContent(msg.content)
        }));

        const todayMood = await getMoodForDay(userId, new Date());
        const currentMood = todayMood?.mood as MoodType || 'okay';
        
        await saveMood(userId, currentMood, conversationToSave);
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }, 1000),
    []
  );

  // Initialize chat data
  const initializeChat = useCallback(async () => {
    if (!user?.id || initRef.current) return;
    initRef.current = true;

    try {
      const todayMood = await getMoodForDay(user.id, new Date());
      
      if (todayMood?.conversation) {
        const savedMessages = (todayMood.conversation as SavedMessage[]);
        setMessages(savedMessages.map(msg => ({
          id: generateId(),
          role: msg.role,
          content: msg.content
        })));
      } else {
        const greeting = await getInitialGreeting(
          todayTrades,
          weekTrades,
          user?.user_metadata?.full_name || user?.email?.split('@')[0]
        );
        const newMessage: Message = {
          id: greeting.id,
          role: 'assistant' as const,
          content: greeting.display
        };
        setMessages([newMessage]);
        
        // Save initial greeting without triggering a reload
        await saveMood(user.id, 'okay', [{
          role: 'assistant' as const,
          content: extractTextContent(greeting.display)
        }]);
      }
      setHasInitializedChat(true);
    } catch (error) {
      console.error('Error initializing chat:', error);
      initRef.current = false; // Allow retry on error
    }
  }, [user?.id, user?.user_metadata?.full_name, user?.email, todayTrades, weekTrades]);

  // Load initial conversation only once when user is available
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Save conversation with debounce, but only for non-initial messages
  useEffect(() => {
    if (!user?.id || messages.length === 0 || !hasInitializedChat || messages.length === 1) return;
    debouncedSaveConversation(user.id, messages);
    
    return () => {
      debouncedSaveConversation.cancel();
    };
  }, [messages, user?.id, debouncedSaveConversation, hasInitializedChat]);

  const handleSendMessage = async (message: string) => {
    if (message.trim() === '' || isLoading) return;

    const newUserMessage: Message = {
      id: generateId(),
      role: 'user',
      content: message
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: extractTextContent(msg.content)
      }));

      const response = await continueWidgetConversation(
        message, 
        todayTrades, 
        weekTrades,
        conversationHistory
      );
      
      setMessages(prev => [...prev, {
        id: response.id,
        role: response.role,
        content: response.display
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleFileUpload = (type: 'camera' | 'photo' | 'folder') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'camera' ? 'image/*;capture=camera' : 'image/*';
      fileInputRef.current.click();
    }
  };

  function handleScroll(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    const scrollArea = e.currentTarget;
    scrollArea.scrollTop += e.deltaY;
  }

  const resetConversation = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const greeting = await getInitialGreeting(
        todayTrades,
        weekTrades,
        user?.user_metadata?.full_name || user?.email?.split('@')[0]
      );
      
      const newMessage: Message = {
        id: greeting.id,
        role: 'assistant' as const,
        content: greeting.display
      };
      
      setMessages([newMessage]);
      
      // Save the reset conversation immediately
      await debouncedSaveConversation.cancel();
      await saveMood(user.id, 'okay', [{
        role: 'assistant' as const,
        content: extractTextContent(greeting.display)
      }]);
    } catch (error) {
      console.error('Error resetting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-background">
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
            {t('chat.title')}
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetConversation}
          disabled={isLoading}
          className={cn(
            "shrink-0",
            size === 'small-long' ? "h-7 w-7" : "h-8 w-8"
          )}
          title={t('chat.resetConversation')}
        >
          <RotateCcw className={cn(
            size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
          )} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative overflow-hidden">
        <ScrollArea 
          className="flex-1 min-h-0 w-full" 
          ref={scrollAreaRef}
          style={{ overscrollBehavior: 'contain' }}
        >
          <div 
            className="p-4 space-y-4 pb-24"
            onWheel={handleScroll}
            onTouchMove={e => e.stopPropagation()}
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div 
                  key={message.id} 
                  className="flex w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  layout
                >
                  <motion.div
                    className={cn(
                      "max-w-[80%] overflow-hidden",
                      message.role === 'assistant' ? "" : "ml-auto"
                    )}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={cn(
                        "p-3 rounded-lg break-words overflow-hidden",
                        message.role === 'assistant'
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      <div className="text-pretty">
                        {message.content}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
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
          </form>
        </div>
      </CardContent>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
      />
    </Card>
  );
} 