/**
 * Starts a durable chat workflow run and streams its output to the client.
 *
 * `WorkflowChatTransport` (see `components/agent-chat.tsx`) requires this POST
 * endpoint to return an `x-workflow-run-id` header, and a GET endpoint at
 * `/api/chat/{runId}/stream` (see `app/api/chat/[id]/stream/route.ts`) so it
 * can reconnect to an in-flight run.
 *
 * Workshop docs: https://agent-foundations-certification.vercel.app/docs/chat-agent
 */

import { chatFlow } from "@/lib/workflows/chat-flow";
import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import type { UIMessage } from "ai";
import { createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const run = await start(chatFlow, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: { "x-workflow-run-id": run.runId },
  });
}
