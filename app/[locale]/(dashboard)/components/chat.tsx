'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Camera, Image, Folder, Send, Loader2 } from 'lucide-react';
import { ClientMessage } from '../server/actions';
import { useActions, useUIState } from 'ai/rsc';
import { generateId } from 'ai';
import { cn } from "@/lib/utils";
import { generateQuestionSuggestions } from '../server/actions';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default function Chat({ dayData, dateString }: { dayData: any, dateString: string }) {
  const [input, setInput] = React.useState<string>('');
  const [conversation, setConversation] = useUIState();
  const { continueConversation } = useActions();
  const [isLoading, setIsLoading] = React.useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  const fetchSuggestions = useCallback(async () => {
    const newSuggestions = await generateQuestionSuggestions(dayData, dateString);
    setSuggestions(newSuggestions);
  }, [dayData, dateString]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleSendMessage = async (message: string) => {
    if (message.trim() === '') return;

    setConversation((currentConversation: ClientMessage[]) => [
      ...currentConversation,
      { id: generateId(), role: 'user', display: message },
    ]);

    setIsLoading(true);
    const response = await continueConversation(message, dayData, dateString);

    setConversation((currentConversation: ClientMessage[]) => [
      ...currentConversation,
      response,
    ]);

    setInput('');
    setIsLoading(false);
  };

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
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs whitespace-normal text-left"
              disabled={isLoading}
            >
              {suggestion}
            </Button>
          ))}
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
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleFileUpload('photo')}>
                <Image className="mr-2 h-4 w-4" />
                Photo
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
            placeholder="Write a reply..."
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading} size="icon" className="shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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