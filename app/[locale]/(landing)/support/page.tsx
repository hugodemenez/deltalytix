'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Actions,
  Action,
} from '@/components/ai-elements/actions';
import { Fragment, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { GlobeIcon, RefreshCcwIcon } from 'lucide-react';
import { useI18n } from '@/locales/client';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { DefaultChatTransport, ToolUIPart, UIMessage } from 'ai';
import { ClipboardCheckIcon } from '@/components/animated-icons/clipboard-check';
import SupportForm from './components/support-form';
import { toast } from 'sonner';
type askForEmailFormToolInput = {
  summary: string;
};

type askForEmailFormToolOutput = {
  summary: string;
};

type askForEmailFormToolUIPart = ToolUIPart<{
  askForEmailForm: {
    input: askForEmailFormToolInput;
    output: askForEmailFormToolOutput;
  };
}>;

const models = [
  {
    name: 'GPT 4o',
    value: 'openai/gpt-4o',
  },
  {
    name: 'Deepseek R1',
    value: 'deepseek/deepseek-r1',
  },
];

const getErrorMessage = (error: any, t: any) => {
  // Handle Vercel AI free credits rate limit error
  if (
    error?.message?.includes('Free credits temporarily have rate limits') ||
    error?.message?.includes('Purchase credits at https://vercel.com') ||
    error?.message?.includes('rate_limit_exceeded') ||
    error?.type === 'rate_limit_exceeded'
  ) {
    return t('support.errors.rateLimit');
  }
  if (error?.message?.includes('service_unavailable') || error?.type === 'service_unavailable') {
    return t('support.errors.serviceUnavailable');
  }
  if (error?.message?.includes('internal_error') || error?.type === 'internal_error') {
    return t('support.errors.internalError');
  }
  return t('support.errors.generic');
};

const ChatBotDemo = () => {
  const t = useI18n();
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const { messages, sendMessage, status, setMessages, error } = useChat(
    {
      transport: new DefaultChatTransport({
        api: '/api/ai/support',
      }) ,
      onFinish: async ({ message }) => {
        console.log(JSON.stringify(message, null, 2));
      },
      onError: (error) => {
        console.error('Chat error:', error);
        // Add error message to chat
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'text',
            text: getErrorMessage(error, t),
          }],
        }]);
      },
    }
  );

  useEffect(() => {
    // If there are no messages, add the greeting message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        parts: [{
          type: 'text',
          text: t('support.greeting'),
        }],
      }]);
    }
  }, [messages.length, setMessages, t]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
        },
      },
    );
    setInput('');
  };

  const latestMessage = messages[messages.length - 1];
  const askForEmailForm = latestMessage?.parts?.find(
    (part) => part.type === 'tool-askForEmailForm',
  ) as askForEmailFormToolUIPart | undefined;
  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100vh-64px)]">
      <div className="flex flex-col h-full">
        {/* Discord Community Section */}
        <a
          href={process.env.NEXT_PUBLIC_DISCORD_INVITATION || '#'}
          target="_blank"
          rel="noreferrer"
          className="mb-6 p-4 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-150 cursor-pointer block group"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {t('support.joinDiscord')}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('support.discordDescription')}
              </p>
            </div>
            <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors duration-150">
              <span className="sr-only">Discord</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
          </div>
        </a>
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source
                          key={`${message.id}-${i}`}
                          href={part.url}
                          title={part.url}
                        />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      // Function to preprocess content and extract <think> tags
                      /**
                       * Extracts content from <think>...</think> tags and removes them from the main content.
                       * Returns an object with:
                       *   - content: the string with all <think>...</think> tags removed
                       *   - think: an array of strings, each being the content of a <think> tag
                       */
                      const preprocessContent = (content: string) => {
                        if (typeof content !== 'string') return { content, think: [] };

                        const think: string[] = [];
                        // Extract all <think>...</think> contents, even if </think> is missing
                        let contentWithoutThink = content;
                        think.length = 0;
                        const thinkRegex = /<think>([\s\S]*?)(<\/think>|$)/g;
                        contentWithoutThink = contentWithoutThink.replace(thinkRegex, (_, thinkContent) => {
                          think.push(thinkContent);
                          return '';
                        });

                        return { content: contentWithoutThink, think };
                      };
                      const { content: contentWithoutThink, think } = preprocessContent(part.text);
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          {think.map((think, index) => (
                            <Reasoning
                              key={`${message.id}-${i}-think-${index}`}
                              className="w-full"
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{think}</ReasoningContent>
                            </Reasoning>
                          ))}
                          <Message from={message.role}>
                            <MessageContent>
                              <Response>
                                {contentWithoutThink}
                              </Response>
                            </MessageContent>
                          </Message>
                          {message.role === 'assistant' && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() =>{
                                  navigator.clipboard.writeText(contentWithoutThink)
                                  toast.success(t('support.copied'),{position: 'top-right'})
                                }}
                                label={t('common.copy')}
                              >
                                <ClipboardCheckIcon size={16} className="mr-2" />
                              </Action>
                            </Actions>
                          )}
                          {
                            message.role === 'user' && (
                              <Actions className="mt-2 justify-end">
                                <Action
                                  onClick={() =>
                                    sendMessage(
                                      { text: part.text },
                                      { body: { model: model, webSearch: webSearch } }
                                    )
                                  }
                                  label={t('common.retry')}
                                >
                                  <RefreshCcwIcon size={16} className="mr-2" />
                                </Action>
                              </Actions>
                            )}
                        </Fragment>
                      );
                    case 'reasoning':
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    case 'tool-askForEmailForm':
                      switch (part.state) {
                        case 'input-available':
                          return (
                            <div key={`${message.id}-${i}`}>
                              {t('support.tool.preparingRequest')}
                            </div>
                          )
                        case 'output-available':
                          if (part.output && typeof part.output === 'object' && 'summary' in part.output && 'locale' in part.output) {
                            return (
                              <div key={`${message.id}-${i}`}>
                                <SupportForm
                                  locale={part.output.locale as 'en' | 'fr'}
                                  messages={messages}
                                  summary={part.output.summary as string}
                                  setMessages={setMessages}
                                  sendMessage={sendMessage}
                                />
                              </div>
                            )
                          }
                        case 'output-error':
                          return (
                            <div key={`${message.id}-${i}`}>
                              {t('support.tool.requestError')}
                              {part.errorText && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {t('support.tool.requestErrorDetails', { error: part.errorText })}
                                </div>
                              )}
                            </div>
                          )
                        default:
                          return null;
                      }
                    default:
                      return null;
                  }
                })}
              </div>
            ))}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder={t('support.inputPlaceholder')}
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>{t('support.search')}</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;