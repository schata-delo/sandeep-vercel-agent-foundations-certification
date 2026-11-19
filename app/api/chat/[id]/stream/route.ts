/**
 * Resumes (reconnects to) the stream of an in-flight chat workflow run.
 *
 * `WorkflowChatTransport` calls `GET /api/chat/{runId}/stream?startIndex=N`
 * after a dropped connection or page reload, where N is the number of UI chunks
 * it has already received.
 *
 * Workshop docs: https://agent-foundations-certification.vercel.app/docs/workflows
 */

import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { createUIMessageStreamResponse } from "ai";
import { getRun } from "workflow/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const uiStartIndex = startIndexParam ? parseInt(startIndexParam, 10) : 0;

  // The workflow stores raw model-call parts, so always replay from index 0 and
  // let the transform skip the first `uiStartIndex` UI chunks.
  const run = await getRun(id);
  const readable = run
    .getReadable({ startIndex: 0 })
    .pipeThrough(createModelCallToUIChunkTransform({ uiStartIndex }));

  return createUIMessageStreamResponse({
    stream: readable,
    headers: { "x-workflow-run-id": id },
  });
}
