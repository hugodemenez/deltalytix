import {
  createTextStreamResponse,
  createUIMessageStreamResponse,
  toTextStream,
  toUIMessageStream,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
} from "ai"

type StreamResult<TOOLS extends ToolSet> = {
  stream: ReadableStream<TextStreamPart<TOOLS>>
}

/** AI SDK 7 replacement for `result.toTextStreamResponse()`. */
export function aiTextStreamResponse<TOOLS extends ToolSet>(
  result: StreamResult<TOOLS>,
) {
  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  })
}

/** AI SDK 7 replacement for `result.toUIMessageStreamResponse()`. */
export function aiUiStreamResponse<
  TOOLS extends ToolSet,
  UI_MESSAGE extends UIMessage = UIMessage,
>(
  result: StreamResult<TOOLS>,
  options?: Omit<
    Parameters<typeof toUIMessageStream<TOOLS, UI_MESSAGE>>[0],
    "stream"
  >,
) {
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      ...options,
    }),
  })
}
