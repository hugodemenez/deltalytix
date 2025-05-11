'use client';

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Camera, Image, Folder, Send, Loader2 } from 'lucide-react';
import { ClientMessage } from '@/server/actions';
import { useActions, useUIState } from 'ai/rsc';
import { generateId } from 'ai';
import { cn } from "@/lib/utils";
import { generateQuestionSuggestions } from '@/server/actions';
import { Skeleton } from "@/components/ui/skeleton";
import { getMoodForDay, saveMood } from '@/server/mood';
import { useUserData } from '@/components/context/user-data';
import { debounce } from 'lodash';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type MoodType = 'bad' | 'okay' | 'great';

function extractTextContent(content: string | React.ReactNode): string {
  if (typeof content === 'string') return content;
  
  if (React.isValidElement(content)) {
    const element = content as React.ReactElement;
    // If it's a chart or complex component, return a descriptive text
    if (typeof element.type === 'function') {
      return '[Chart Analysis]';
    }
    
    const props = element.props as { children?: React.ReactNode };
    if (props.children) {
      // Recursively extract text from nested elements
      return Array.isArray(props.children)
        ? props.children.map((child: React.ReactNode) => extractTextContent(child)).join(' ')
        : extractTextContent(props.children);
    }
  }
  return String(content);
}

// Custom hook for managing suggestions
function useSuggestions(dayData: any, dateString: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchSuggestions = async () => {
      try {
        const newSuggestions = await generateQuestionSuggestions(dayData, dateString);
        if (isMounted) {
          setSuggestions(newSuggestions);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [dayData, dateString]);

  return { suggestions, isLoading };
}

interface SavedConversation {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat({ dayData, dateString }: { dayData: any, dateString: string }) {
  const [input, setInput] = useState<string>('');
  const [conversation, setConversation] = useUIState();
  const { continueConversation } = useActions();
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { suggestions, isLoading: isSuggestionsLoading } = useSuggestions(dayData, dateString);
  const { user } = useUserData();
  const initRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load historical chat messages for the specific day
  useEffect(() => {
    async function loadDayChat() {
      if (!user?.id || initRef.current) return;
      initRef.current = true;

      try {
        const dayMood = await getMoodForDay(new Date(dateString));
        
        if (dayMood?.conversation) {
          const savedMessages = dayMood.conversation as Array<{
            role: 'user' | 'assistant';
            content: string;
          }>;
          
          // Convert saved messages to ClientMessage format
          const clientMessages: ClientMessage[] = savedMessages.map(msg => ({
            id: generateId(),
            role: msg.role,
            display: msg.content
          }));
          
          // Initialize conversation with saved messages
          if (clientMessages.length > 0) {
            setConversation(clientMessages);
          }
        }
      } catch (error) {
        console.error('Error loading day chat:', error);
        initRef.current = false;
      } finally {
        setIsInitializing(false);
      }
    }

    // Reset state when date changes
    initRef.current = false;
    setIsInitializing(true);
    loadDayChat();

    // Cleanup function
    return () => {
      initRef.current = true;
    };
  }, [user?.id, dateString, setConversation]);

  // Save conversation when it changes
  const saveConversation = useCallback(async (userId: string, messages: ClientMessage[], date: string) => {
    if (messages.length === 0 || isInitializing) return;

    try {
      // Convert ClientMessage to SavedConversation, ensuring content is string
      const conversationToSave: SavedConversation[] = messages.map(msg => ({
        role: msg.role,
        content: extractTextContent(msg.display)
      }));

      const dayMood = await getMoodForDay(new Date(date));
      let currentMood: MoodType = 'okay';
      if (dayMood?.mood && ['bad', 'okay', 'great'].includes(dayMood.mood)) {
        currentMood = dayMood.mood as MoodType;
      }
      
      await saveMood(currentMood, conversationToSave, new Date(date));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }, [isInitializing]);

  const debouncedSaveConversation = useMemo(
    () => debounce(saveConversation, 1000),
    [saveConversation]
  );

  useEffect(() => {
    if (!user?.id || conversation.length === 0) return;
    debouncedSaveConversation(user.id, conversation, dateString);
    
    return () => {
      debouncedSaveConversation.cancel();
    };
  }, [conversation, user?.id, dateString, debouncedSaveConversation]);

  const handleSendMessage = useCallback(async (userMessage: string) => {
    if (userMessage.trim() === '' || isMessageLoading) return;

    setConversation((currentConversation: ClientMessage[]) => [
      ...currentConversation,
      { id: generateId(), role: 'user', display: userMessage },
    ]);

    setInput('');
    setIsMessageLoading(true);

    try {
      const response = await continueConversation(userMessage, dayData, dateString);
      setConversation((currentConversation: ClientMessage[]) => [
        ...currentConversation,
        response,
      ]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setConversation((currentConversation: ClientMessage[]) => [
        ...currentConversation,
        { 
          id: generateId(), 
          role: 'assistant', 
          display: 'Sorry, I encountered an error. Please try again.' 
        },
      ]);
    } finally {
      setIsMessageLoading(false);
    }
  }, [continueConversation, dayData, dateString, setConversation, isMessageLoading, setInput, setIsMessageLoading]);

  const handleFileUpload = (type: 'camera' | 'photo' | 'folder') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'camera' ? 'image/*;capture=camera' : 'image/*';
      fileInputRef.current.click();
    }
  };

  const renderMessage = (message: ClientMessage) => {
    return (
      <div className={cn("max-w-[80%] p-3 rounded-lg", 
        message.role === 'assistant' 
          ? "bg-muted text-muted-foreground" 
          : "bg-primary text-primary-foreground"
      )}>
        {message.display}
      </div>
    );
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const renderSuggestions = () => {
    if (isSuggestionsLoading) {
      const skeletonWidths = ['w-64', 'w-80', 'w-96'];
      return (
        <>
          {skeletonWidths.map((width, index) => (
            <Skeleton 
              key={index}
              className={`h-8 rounded-full ${width}`}
            />
          ))}
        </>
      );
    }

    if (suggestions?.length === 0) {
      return <div className="text-sm text-muted-foreground">No suggestions available</div>;
    }

    return suggestions.map((suggestion, index) => (
      <Button
        key={index}
        variant="outline"
        size="sm"
        onClick={() => handleSuggestionClick(suggestion)}
        className="text-xs whitespace-normal text-left"
        disabled={isMessageLoading}
      >
        {suggestion}
      </Button>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        {conversation.map((message: ClientMessage) => (
          <div key={message.id} className={cn("flex", message.role === 'assistant' ? "justify-start" : "justify-end")}>
            {renderMessage(message)}
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-background sticky bottom-0 left-0 right-0">
        <div className="flex flex-wrap gap-2 mb-2">
          {renderSuggestions()}
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }} className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-0">
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleFileUpload('camera')}>
                <Camera className="mr-2 h-4 w-4" />
                Camera
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleFileUpload('folder')}>
                <Folder className="mr-2 h-4 w-4" />
                Folder
              </Button>
            </PopoverContent>
          </Popover>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isMessageLoading ? "AI is thinking..." : "Write a reply..."}
            className="flex-grow"
            disabled={isMessageLoading}
          />
          <Button type="submit" disabled={isMessageLoading} size="icon" className="shrink-0">
            {isMessageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
