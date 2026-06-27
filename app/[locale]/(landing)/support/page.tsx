'use client';

import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Actions,
  Action,
} from '@/components/ai-elements/actions';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { HeadsetIcon, RefreshCcwIcon } from 'lucide-react';
import { useI18n } from '@/locales/landing-client';
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
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { DefaultChatTransport, ToolUIPart } from 'ai';
import { ClipboardCheckIcon } from '@/components/animated-icons/clipboard-check';
import SupportForm from './components/support-form';
import { toast } from 'sonner';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import {
  Message as ChatMessage,
  MessageContent,
  MessageFooter,
} from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITATION;

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

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

const getErrorMessage = (error: any, t: any) => {
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

const preprocessContent = (content: string) => {
  if (typeof content !== 'string') return { content, think: [] as string[] };

  const think: string[] = [];
  const thinkRegex = /<think>([\s\S]*?)(<\/think>|$)/g;
  const contentWithoutThink = content.replace(thinkRegex, (_, thinkContent) => {
    think.push(thinkContent);
    return '';
  });

  return { content: contentWithoutThink, think };
};

const ChatBotDemo = () => {
  const t = useI18n();
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/support',
    }),
    onError: (error) => {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: getErrorMessage(error, t),
            },
          ],
        },
      ]);
    },
  });

  const suggestions = useMemo(
    () => [
      t('support.suggestionImport'),
      t('support.suggestionBilling'),
      t('support.suggestionBug'),
      t('support.suggestionHuman'),
    ],
    [t],
  );

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: t('support.greeting'),
            },
          ],
        },
      ]);
    }
  }, [messages.length, setMessages, t]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage({
      text: message.text || 'Sent with attachments',
      files: message.files,
    });
    setInput('');
  };

  const sendWithOptions = (text: string) => {
    sendMessage({ text });
  };

  const isBusy = status === 'submitted' || status === 'streaming';
  const showStarterActions = messages.length <= 1 && !isBusy;

  return (
    <MessageScrollerProvider autoScroll>
      <div className="mx-auto flex size-full h-[calc(100vh-64px)] max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardHeader className="gap-1 border-b py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HeadsetIcon className="size-5 text-primary" />
              {t('support.pageTitle')}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={isBusy} className="gap-4 p-4">
                  {messages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      scrollAnchor={message.role === 'user'}
                    >
                      {message.role === 'assistant' &&
                        message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                          <Sources>
                            <SourcesTrigger
                              count={
                                message.parts.filter((part) => part.type === 'source-url').length
                              }
                            />
                            {message.parts
                              .filter((part) => part.type === 'source-url')
                              .map((part, i) => (
                                <SourcesContent key={`${message.id}-${i}`}>
                                  <Source href={part.url} title={part.url} />
                                </SourcesContent>
                              ))}
                          </Sources>
                        )}

                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text': {
                            const { content: contentWithoutThink, think } = preprocessContent(
                              part.text,
                            );
                            const isUser = message.role === 'user';

                            return (
                              <Fragment key={`${message.id}-${i}`}>
                                {think.map((thought, index) => (
                                  <Reasoning
                                    key={`${message.id}-${i}-think-${index}`}
                                    className="w-full"
                                  >
                                    <ReasoningTrigger />
                                    <ReasoningContent>{thought}</ReasoningContent>
                                  </Reasoning>
                                ))}
                                <ChatMessage align={isUser ? 'end' : 'start'}>
                                  <MessageContent>
                                    <Bubble
                                      variant={isUser ? 'default' : 'muted'}
                                      align={isUser ? 'end' : 'start'}
                                    >
                                      <BubbleContent>
                                        <Response>{contentWithoutThink}</Response>
                                      </BubbleContent>
                                    </Bubble>
                                    {message.role === 'assistant' && (
                                      <MessageFooter>
                                        <Actions>
                                          <Action
                                            onClick={() => {
                                              navigator.clipboard.writeText(contentWithoutThink);
                                              toast.success(t('support.copied'), {
                                                position: 'top-right',
                                              });
                                            }}
                                            label={t('common.copy')}
                                          >
                                            <ClipboardCheckIcon size={16} className="mr-2" />
                                          </Action>
                                        </Actions>
                                      </MessageFooter>
                                    )}
                                    {message.role === 'user' && (
                                      <MessageFooter>
                                        <Actions className="justify-end">
                                          <Action
                                            onClick={() => sendWithOptions(part.text)}
                                            label={t('common.retry')}
                                          >
                                            <RefreshCcwIcon size={16} className="mr-2" />
                                          </Action>
                                        </Actions>
                                      </MessageFooter>
                                    )}
                                  </MessageContent>
                                </ChatMessage>
                              </Fragment>
                            );
                          }
                          case 'reasoning':
                            return (
                              <Reasoning
                                key={`${message.id}-${i}`}
                                className="w-full"
                                isStreaming={
                                  status === 'streaming' &&
                                  i === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          case 'tool-searchCodebase': {
                            switch (part.state) {
                              case 'input-available':
                              case 'input-streaming':
                                return (
                                  <Marker key={`${message.id}-${i}`}>
                                    <MarkerContent className="shimmer">
                                      {t('support.tool.searchingDocs')}
                                    </MarkerContent>
                                  </Marker>
                                );
                              default:
                                return null;
                            }
                          }
                          case 'tool-askForEmailForm': {
                            switch (part.state) {
                              case 'input-available':
                                return (
                                  <Marker key={`${message.id}-${i}`}>
                                    <MarkerContent className="shimmer">
                                      {t('support.tool.preparingRequest')}
                                    </MarkerContent>
                                  </Marker>
                                );
                              case 'output-available':
                                if (
                                  part.output &&
                                  typeof part.output === 'object' &&
                                  'summary' in part.output &&
                                  'locale' in part.output
                                ) {
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
                                  );
                                }
                                return null;
                              case 'output-error':
                                return (
                                  <Marker key={`${message.id}-${i}`} variant="border">
                                    <MarkerContent>
                                      {t('support.tool.requestError')}
                                      {part.errorText && (
                                        <span className="mt-2 block text-sm text-muted-foreground">
                                          {t('support.tool.requestErrorDetails', {
                                            error: part.errorText,
                                          })}
                                        </span>
                                      )}
                                    </MarkerContent>
                                  </Marker>
                                );
                              default:
                                return null;
                            }
                          }
                          default:
                            return null;
                        }
                      })}
                    </MessageScrollerItem>
                  ))}

                  {showStarterActions && DISCORD_INVITE_URL && (
                    <MessageScrollerItem>
                      <ChatMessage align="start">
                        <MessageContent>
                          <div className="flex max-w-sm flex-col gap-2">
                            <a
                              href={DISCORD_INVITE_URL}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-fit items-center gap-2.5 rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4752C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]/60 focus-visible:ring-offset-2"
                            >
                              <DiscordIcon className="size-5 shrink-0" />
                              {t('support.joinDiscord')}
                            </a>
                            <p className="text-xs text-muted-foreground">
                              {t('support.discordDescription')}
                            </p>
                          </div>
                        </MessageContent>
                      </ChatMessage>
                    </MessageScrollerItem>
                  )}

                  {status === 'submitted' && (
                    <Marker>
                      <MarkerContent className="shimmer">
                        {t('support.generating')}
                      </MarkerContent>
                    </Marker>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>

            {showStarterActions && (
              <div className="border-t px-4 py-3">
                <Suggestions>
                  {suggestions.map((suggestion) => (
                    <Suggestion
                      key={suggestion}
                      suggestion={suggestion}
                      onClick={sendWithOptions}
                    />
                  ))}
                </Suggestions>
              </div>
            )}
          </CardContent>
        </Card>

        <PromptInput onSubmit={handleSubmit} globalDrop multiple>
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
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </MessageScrollerProvider>
  );
};

export default ChatBotDemo;
