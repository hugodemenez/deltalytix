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
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  Actions,
  Action,
} from '@/components/ai-elements/actions';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import {
  BrainIcon,
  ChevronDownIcon,
  HeadsetIcon,
  PencilIcon,
  RefreshCcwIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCurrentLocale, useI18n } from '@/locales/landing-client';
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
import {
  resolveStableReasoningLabel,
} from './reasoning-label';
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
} from '@/components/ui/card';

const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITATION;

type askForEmailFormToolInput = {
  summary: string;
};

type askForEmailFormToolOutput = {
  summary: string;
  locale: 'en' | 'fr';
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

const ATTACHMENT_ONLY_PLACEHOLDER = 'Sent with attachments';

/**
 * Lock the title once the first line is complete so streaming does not flicker
 * between a growing title, a dropped label, and a static i18n string.
 */
function useStableReasoningLabel(text: string, isStreaming: boolean, lockKey: string): string {
  const lockedRef = useRef<string | null>(null);
  const lockKeyRef = useRef(lockKey);

  if (lockKeyRef.current !== lockKey) {
    lockKeyRef.current = lockKey;
    lockedRef.current = null;
  }

  const resolved = resolveStableReasoningLabel({
    text,
    isStreaming,
    locked: lockedRef.current,
  });
  lockedRef.current = resolved.locked;

  return resolved.label;
}

function ReasoningBlock({
  text,
  isStreaming = false,
  lockKey,
  className,
}: {
  text: string;
  isStreaming?: boolean;
  /** Stable id for this reasoning step — changing it clears the locked title. */
  lockKey: string;
  className?: string;
}) {
  const label = useStableReasoningLabel(text, isStreaming, lockKey);

  return (
    <Reasoning
      className={cn('w-full', className)}
      defaultOpen={false}
      disableAutoClose
      isStreaming={isStreaming}
    >
      <ReasoningTrigger className="group">
        <BrainIcon className="size-4 shrink-0" />
        <span className={cn('min-w-0 truncate text-left', isStreaming && 'shimmer')}>
          {/* Keep height stable while waiting for the first model tokens. */}
          {label || '\u00A0'}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      </ReasoningTrigger>
      {text.trim() ? <ReasoningContent>{text}</ReasoningContent> : null}
    </Reasoning>
  );
}

function hasActiveReasoningRow(
  message: ReturnType<typeof useChat>['messages'][number] | undefined,
  status: ReturnType<typeof useChat>['status'],
) {
  if (!message || message.role !== 'assistant') return false;

  const lastReasoningIndex = message.parts.reduce(
    (last, part, index) => (part.type === 'reasoning' ? index : last),
    -1,
  );
  if (lastReasoningIndex === -1) return false;

  const part = message.parts[lastReasoningIndex];
  if (part?.type !== 'reasoning') return false;

  const isStreamingReasoning = status === 'streaming';
  return Boolean(part.text?.trim()) || isStreamingReasoning;
}

function SupportPromptSubmit({
  input,
  status,
}: {
  input: string;
  status: ReturnType<typeof useChat>['status'];
}) {
  const attachments = usePromptInputAttachments();
  const canSend =
    Boolean(input.trim()) || attachments.files.length > 0;

  return (
    <PromptInputSubmit disabled={!canSend} status={status} />
  );
}

/** Falls back to the user's own words when the assistant has not summarised anything. */
const buildConversationSummary = (messages: ReturnType<typeof useChat>['messages']) =>
  messages
    .filter((message) => message.role === 'user')
    .flatMap((message) =>
      message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text.trim()),
    )
    .filter((text) => text && text !== ATTACHMENT_ONLY_PLACEHOLDER)
    .join('\n\n')
    .slice(0, 2000);

const ChatBotDemo = () => {
  const t = useI18n();
  const locale = useCurrentLocale();
  const [input, setInput] = useState('');
  const [contactForm, setContactForm] = useState({ open: false, summary: '' });
  // Set while the composer holds an earlier message being rewritten.
  const [pendingEditMessageId, setPendingEditMessageId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // Tool-driven escalations should pop the dialog once, not on every re-render.
  const autoOpenedEscalations = useRef(new Set<string>());
  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/support',
      body: () => ({
        locale,
      }),
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

  const openContactForm = useCallback(
    (summary?: string) => {
      setContactForm((current) => ({
        open: true,
        summary: summary ?? current.summary,
      }));
    },
    [],
  );

  const requestHumanSupport = useCallback(() => {
    openContactForm(buildConversationSummary(messages));
  }, [messages, openContactForm]);

  /**
   * Drop `messageId` and everything after it. `setMessages` writes through to the
   * chat store synchronously, so a send issued right after already sees the
   * truncated history.
   */
  const truncateFrom = useCallback(
    (messageId: string) => {
      if (status === 'submitted' || status === 'streaming') {
        stop();
      }

      setMessages((current) => {
        const index = current.findIndex((message) => message.id === messageId);
        return index === -1 ? current : current.slice(0, index);
      });
    },
    [status, stop, setMessages],
  );

  // Editing pulls the message back into the composer; the messages it would
  // replace stay visible but dimmed until the user sends or cancels.
  const startEditing = useCallback((messageId: string, text: string) => {
    setPendingEditMessageId(messageId);
    setInput(text);
  }, []);

  const cancelEditing = useCallback(() => {
    setPendingEditMessageId(null);
    setInput('');
  }, []);

  // Focus after React commits the edited text — rAF from the click handler races
  // the controlled value update and often never lands on the textarea.
  useEffect(() => {
    if (!pendingEditMessageId) return;

    const composer = composerRef.current;
    if (!composer) return;

    composer.focus();
    const cursor = composer.value.length;
    composer.setSelectionRange(cursor, cursor);
  }, [pendingEditMessageId]);

  const pendingEditIndex = pendingEditMessageId
    ? messages.findIndex((message) => message.id === pendingEditMessageId)
    : -1;

  // The assistant can also escalate on its own — surface its summary in the form.
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== 'tool-askForEmailForm') continue;

        const toolPart = part as askForEmailFormToolUIPart;
        if (toolPart.state !== 'output-available' || !toolPart.toolCallId) continue;
        if (autoOpenedEscalations.current.has(toolPart.toolCallId)) continue;

        autoOpenedEscalations.current.add(toolPart.toolCallId);
        setContactForm({ open: true, summary: toolPart.output?.summary ?? '' });
      }
    }
  }, [messages]);

  const suggestions = useMemo(
    () => [
      t('support.suggestionImport'),
      t('support.suggestionBilling'),
      t('support.suggestionBug'),
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
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Sending while editing replaces the original message and everything after it.
    if (pendingEditMessageId) {
      truncateFrom(pendingEditMessageId);
      setPendingEditMessageId(null);
    }

    if (hasText) {
      sendMessage({
        text: message.text!,
        ...(hasAttachments ? { files: message.files } : {}),
      });
    } else {
      sendMessage({ files: message.files! });
    }
    setInput('');
  };

  const sendWithOptions = (text: string) => {
    sendMessage({ text });
  };

  const isBusy = status === 'submitted' || status === 'streaming';
  const hasStarted = messages.some((message) => message.role === 'user');
  const showStarterActions = messages.length <= 1 && !isBusy;
  // Once the conversation has started, the human escape hatch stays available.
  const showHumanHandoff = hasStarted && !isBusy;
  const showPendingIndicator =
    isBusy && !hasActiveReasoningRow(messages.at(-1), status);

  return (
    <MessageScrollerProvider autoScroll>
      <div className="mx-auto flex size-full h-[calc(100vh-64px)] max-w-4xl flex-col gap-4 p-4 sm:p-6">
        {/* Page title lives outside the chat surface, like /updates. */}
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <HeadsetIcon className="size-6 text-primary" />
            {t('support.pageTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('support.pageDescription')}
            {DISCORD_INVITE_URL && (
              <>
                {' '}
                {t('support.discordPrompt')}{' '}
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {t('support.joinDiscordInline')}
                </a>
                .
              </>
            )}
          </p>
        </header>

        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          {/* Escalation appears only once the conversation has started. */}
          {showHumanHandoff && (
            <div className="flex justify-end border-b px-4 py-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={requestHumanSupport}
              >
                <HeadsetIcon className="size-4" />
                {t('support.requestHumanSupport')}
              </Button>
            </div>
          )}

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={isBusy} className="gap-4 p-4">
                  {messages.map((message, messageIndex) => (
                    <MessageScrollerItem
                      key={message.id}
                      scrollAnchor={message.role === 'user'}
                      // Dimmed = will be discarded when the edit is sent.
                      className={
                        pendingEditIndex !== -1 && messageIndex >= pendingEditIndex
                          ? 'opacity-40 transition-opacity'
                          : 'transition-opacity'
                      }
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
                          case 'file': {
                            if (!part.mediaType?.startsWith('image/') || !part.url) {
                              return null;
                            }

                            const isUser = message.role === 'user';

                            return (
                              <ChatMessage key={`${message.id}-${i}`} align={isUser ? 'end' : 'start'}>
                                <MessageContent>
                                  <Bubble
                                    variant={isUser ? 'default' : 'muted'}
                                    align={isUser ? 'end' : 'start'}
                                  >
                                    <BubbleContent>
                                      <img
                                        alt={part.filename || 'attachment'}
                                        className="max-h-96 max-w-full rounded-lg object-contain"
                                        src={part.url}
                                      />
                                    </BubbleContent>
                                  </Bubble>
                                </MessageContent>
                              </ChatMessage>
                            );
                          }
                          case 'text': {
                            const { content: contentWithoutThink, think } = preprocessContent(
                              part.text,
                            );
                            const isUser = message.role === 'user';

                            if (
                              isUser &&
                              !contentWithoutThink.trim() &&
                              message.parts.some((p) => p.type === 'file')
                            ) {
                              return null;
                            }

                            if (
                              isUser &&
                              contentWithoutThink.trim() === ATTACHMENT_ONLY_PLACEHOLDER &&
                              message.parts.some((p) => p.type === 'file')
                            ) {
                              return null;
                            }

                            return (
                              <Fragment key={`${message.id}-${i}`}>
                                {think.map((thought, index) => (
                                  <ReasoningBlock
                                    key={`${message.id}-${i}-think-${index}`}
                                    lockKey={`${message.id}-${i}-think-${index}`}
                                    text={thought}
                                  />
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
                                        <Actions
                                          className={cn(
                                            message.id.startsWith('error-') &&
                                              'opacity-0 pointer-events-none transition-opacity group-hover/message:opacity-100 group-hover/message:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto',
                                          )}
                                        >
                                          {!message.id.startsWith('error-') && (
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
                                          )}
                                          {message.id.startsWith('error-') && (
                                            <Action
                                              onClick={() => {
                                                const previousUserText = [...messages]
                                                  .slice(
                                                    0,
                                                    messages.findIndex(
                                                      (candidate) => candidate.id === message.id,
                                                    ),
                                                  )
                                                  .reverse()
                                                  .find((candidate) => candidate.role === 'user')
                                                  ?.parts.filter((candidate) => candidate.type === 'text')
                                                  .map((candidate) => candidate.text.trim())
                                                  .find(Boolean);

                                                if (!previousUserText) return;

                                                truncateFrom(message.id);
                                                sendMessage({ text: previousUserText });
                                              }}
                                              label={t('common.retry')}
                                            >
                                              <RefreshCcwIcon size={16} className="mr-2" />
                                            </Action>
                                          )}
                                        </Actions>
                                      </MessageFooter>
                                    )}
                                    {isUser &&
                                      !message.parts.some((candidate) => candidate.type === 'file') && (
                                      <MessageFooter>
                                        <Actions className="justify-end opacity-0 pointer-events-none transition-opacity group-hover/message:opacity-100 group-hover/message:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
                                          <Action
                                            onClick={() => startEditing(message.id, part.text)}
                                            label={t('common.edit')}
                                          >
                                            <PencilIcon size={16} className="mr-2" />
                                          </Action>
                                        </Actions>
                                      </MessageFooter>
                                    )}
                                  </MessageContent>
                                </ChatMessage>
                              </Fragment>
                            );
                          }
                          case 'reasoning': {
                            const lastReasoningIndex = message.parts.reduce(
                              (last, candidate, index) =>
                                candidate.type === 'reasoning' ? index : last,
                              -1,
                            );
                            const isStreamingReasoning =
                              status === 'streaming' &&
                              i === lastReasoningIndex &&
                              message.id === messages.at(-1)?.id;

                            // Keep the brain visible while reasoning tokens are still empty.
                            if (!part.text?.trim() && !isStreamingReasoning) {
                              return null;
                            }

                            return (
                              <ReasoningBlock
                                key={`${message.id}-reasoning-${i}`}
                                lockKey={`${message.id}-reasoning-${i}`}
                                text={part.text ?? ''}
                                isStreaming={isStreamingReasoning}
                              />
                            );
                          }
                          case 'tool-searchCodebase':
                          case 'tool-listCodebaseFiles':
                          case 'tool-grepCodebase':
                          case 'tool-readCodebaseFile': {
                            switch (part.state) {
                              case 'input-available':
                              case 'input-streaming': {
                                const label =
                                  part.type === 'tool-readCodebaseFile'
                                    ? t('support.tool.readingFile')
                                    : part.type === 'tool-grepCodebase'
                                      ? t('support.tool.grepping')
                                      : t('support.tool.searchingDocs');

                                return (
                                  <Marker key={`${message.id}-${i}`}>
                                    <MarkerContent className="shimmer">{label}</MarkerContent>
                                  </Marker>
                                );
                              }
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
                              case 'output-available': {
                                const summary =
                                  part.output &&
                                  typeof part.output === 'object' &&
                                  'summary' in part.output
                                    ? (part.output.summary as string)
                                    : '';

                                return (
                                  <Marker key={`${message.id}-${i}`} variant="border">
                                    <MarkerContent className="flex flex-wrap items-center justify-between gap-2">
                                      {t('support.tool.requestReady')}
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => openContactForm(summary)}
                                      >
                                        {t('support.openContactForm')}
                                      </Button>
                                    </MarkerContent>
                                  </Marker>
                                );
                              }
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

                  {showPendingIndicator && (
                    <ReasoningBlock
                      lockKey={`pending-${messages.at(-1)?.id ?? 'new'}`}
                      text=""
                      isStreaming
                    />
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
                  {/* Goes straight to the form — routing it through the model is the loop we are fixing. */}
                  <Suggestion
                    suggestion={t('support.suggestionHuman')}
                    onClick={requestHumanSupport}
                  />
                </Suggestions>
              </div>
            )}

            {/* Input is docked inside the chat panel so it reads as one conversation surface. */}
            <div
              className="border-t p-3 sm:p-4"
              // Escape bubbles up from the textarea, which owns its own onKeyDown.
              onKeyDown={(event) => {
                if (event.key === 'Escape' && pendingEditMessageId) {
                  cancelEditing();
                }
              }}
            >
              {pendingEditMessageId && (
                <Marker className="mb-2">
                  <MarkerContent className="flex flex-wrap items-center justify-between gap-2">
                    {t('support.editingNotice')}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditing}
                    >
                      {t('common.cancel')}
                    </Button>
                  </MarkerContent>
                </Marker>
              )}
              <PromptInput accept="image/*" onSubmit={handleSubmit} globalDrop multiple>
                <PromptInputBody>
                  <PromptInputAttachments>
                    {(attachment) => <PromptInputAttachment data={attachment} />}
                  </PromptInputAttachments>
                  <PromptInputTextarea
                    ref={composerRef}
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
                  <SupportPromptSubmit input={input} status={status} />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </CardContent>
        </Card>

        <SupportForm
          open={contactForm.open}
          onOpenChange={(open) => setContactForm((current) => ({ ...current, open }))}
          summary={contactForm.summary}
          locale={locale}
          messages={messages}
          setMessages={setMessages}
        />
      </div>
    </MessageScrollerProvider>
  );
};

export default ChatBotDemo;
