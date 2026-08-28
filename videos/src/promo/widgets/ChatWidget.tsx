import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { DatabaseIcon, PlusIcon, RotateCcwIcon, SendIcon } from "./Icons";
import { chatCopy } from "./product-copy";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

const COMPOSE_END = 24;
const QUESTION_END = 32;
const THINK_END = 52;
const STREAM_END = 84;

type ChatStage = "composing" | "question" | "thinking" | "response" | "insight";

const stageAt = (frame: number): ChatStage => {
  if (frame < COMPOSE_END) return "composing";
  if (frame < QUESTION_END) return "question";
  if (frame < THINK_END) return "thinking";
  if (frame < STREAM_END) return "response";
  return "insight";
};

type ChatWidgetProps = {
  readonly startFrame?: number;
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({ startFrame = 0 }) => {
  const frame = Math.max(0, useCurrentFrame() - startFrame);
  const stage = stageAt(frame);
  const typedChars = Math.round(
    interpolate(frame, [0, COMPOSE_END - 4], [0, chatCopy.question.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const streamedChars = Math.round(
    interpolate(
      frame,
      [THINK_END, STREAM_END - 4],
      [0, chatCopy.response.length],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );
  const showQuestion = stage !== "composing";
  const showAssistant =
    stage === "thinking" || stage === "response" || stage === "insight";
  const responseRevealed = stage === "response" || stage === "insight";
  const pulse = 0.45 + Math.sin(frame / 5) * 0.2;

  return (
    <Interactive.Div
      name="Chat widget"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        maxWidth: 980,
        marginLeft: "auto",
        marginRight: "auto",
        overflow: "hidden",
        backgroundColor: tokens.canvas,
        border: `1px solid ${tokens.border}`,
        borderRadius: 12,
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Chat header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          paddingLeft: 24,
          paddingRight: 24,
          borderBottom: `1px solid ${tokens.border}`,
        }}
      >
        <Interactive.Div
          name="Chat title"
          style={{
            color: tokens.ink,
            fontSize: 22,
            fontWeight: 500,
          }}
        >
          {chatCopy.widgetTitle}
        </Interactive.Div>
        <RotateCcwIcon name="Chat reset" size={18} color={tokens.muted} />
      </Interactive.Div>

      <Interactive.Div
        name="Chat thread"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 12,
          padding: "24px 28px",
        }}
      >
        <Interactive.Div
          name="Chat context"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: tokens.muted,
            fontSize: 15,
          }}
        >
          <DatabaseIcon name="Chat database" size={14} color={tokens.muted} />
          {chatCopy.contextAnalyzed}
        </Interactive.Div>

        {showQuestion ? (
          <Interactive.Div
            name="User bubble"
            style={{
              alignSelf: "flex-end",
              maxWidth: "80%",
              backgroundColor: tokens.action,
              color: tokens.actionInk,
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 18,
              lineHeight: 1.45,
              fontWeight: 400,
              opacity: interpolate(frame, [COMPOSE_END, COMPOSE_END + 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: BEZIER,
              }),
            }}
          >
            {chatCopy.question}
          </Interactive.Div>
        ) : null}

        {showAssistant ? (
          <Interactive.Div
            name="Assistant bubble"
            style={{
              alignSelf: "flex-start",
              maxWidth: "88%",
              opacity: interpolate(frame, [QUESTION_END, QUESTION_END + 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: BEZIER,
              }),
            }}
          >
            {responseRevealed ? (
              <Interactive.Div
                name="Assistant response"
                style={{
                  backgroundColor: tokens.mutedFill,
                  color: tokens.ink,
                  borderRadius: 12,
                  padding: "12px 16px",
                  fontSize: 18,
                  lineHeight: 1.45,
                }}
              >
                {chatCopy.response.slice(0, streamedChars)}
              </Interactive.Div>
            ) : (
              <Interactive.Div
                name="Assistant thinking"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 10,
                  backgroundColor: tokens.mutedFill,
                  borderRadius: 12,
                  padding: "16px 16px",
                }}
              >
                <Interactive.Div
                  name="Think bar 1"
                  style={{
                    height: 8,
                    width: "88%",
                    borderRadius: 99,
                    backgroundColor: tokens.ink,
                    opacity: pulse * 0.18,
                  }}
                />
                <Interactive.Div
                  name="Think bar 2"
                  style={{
                    height: 8,
                    width: "68%",
                    borderRadius: 99,
                    backgroundColor: tokens.ink,
                    opacity: pulse * 0.12,
                  }}
                />
                <Interactive.Div
                  name="Think label"
                  style={{
                    marginTop: 4,
                    color: tokens.muted,
                    fontSize: 14,
                  }}
                >
                  {chatCopy.analyzing}
                </Interactive.Div>
              </Interactive.Div>
            )}
          </Interactive.Div>
        ) : null}
      </Interactive.Div>

      <Interactive.Div
        name="Chat composer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          borderTop: `1px solid ${tokens.border}`,
        }}
      >
        <Interactive.Div
          name="Attach"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 6,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <PlusIcon name="Attach icon" size={16} color={tokens.muted} />
        </Interactive.Div>
        <Interactive.Div
          name="Composer field"
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            paddingRight: 14,
            borderRadius: 6,
            border: `1px solid ${tokens.border}`,
            color: tokens.muted,
            fontSize: 16,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {stage === "composing"
            ? chatCopy.question.slice(0, typedChars)
            : chatCopy.inputPlaceholder}
          {stage === "composing" ? (
            <Interactive.Span
              name="Composer caret"
              style={{
                display: "inline-block",
                width: 1,
                height: "0.9em",
                marginLeft: 2,
                backgroundColor: tokens.muted,
                opacity: 0.35 + Math.sin(frame / 4.5) * 0.4,
                flexShrink: 0,
              }}
            />
          ) : null}
        </Interactive.Div>
        <Interactive.Div
          name="Send"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 6,
            backgroundColor: tokens.action,
          }}
        >
          <SendIcon name="Send icon" size={16} color={tokens.actionInk} />
        </Interactive.Div>
      </Interactive.Div>
    </Interactive.Div>
  );
};
