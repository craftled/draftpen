import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { differenceInSeconds } from "date-fns";
import { auth } from "@/lib/auth";
import {
  getChatById,
  getMessagesByChatId,
  getStreamIdsByChatId,
} from "@/lib/db/queries";
import type { Chat } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { getStreamContext } from "../../route";

const RESUME_THRESHOLD_SECONDS = 15 as const;

function createEmptyDataStream() {
  return createUIMessageStream<ChatMessage>({
    execute: () => {
      /* no-op: used to initialize a resumable empty stream */
    },
  });
}

function createRestoredStream(message: ChatMessage) {
  return createUIMessageStream<ChatMessage>({
    execute: ({ writer }) => {
      writer.write({
        type: "data-appendMessage",
        data: JSON.stringify(message),
        transient: true,
      });
    },
  });
}

async function validateChatAccess(
  chatId: string,
  session: { user: { id: string } }
): Promise<Chat> {
  let chat: Chat;
  try {
    chat = await getChatById({ id: chatId });
  } catch {
    throw new ChatSDKError("not_found:chat");
  }

  if (!chat) {
    throw new ChatSDKError("not_found:chat");
  }

  if (chat.visibility === "private" && chat.userId !== session.user.id) {
    throw new ChatSDKError("forbidden:chat");
  }

  return chat;
}

async function handleStreamResumption(
  chatId: string,
  resumeRequestedAt: Date,
  emptyDataStream: ReadableStream
) {
  const messages = await getMessagesByChatId({ id: chatId });
  const mostRecentMessage = messages.at(-1);

  if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
    return new Response(emptyDataStream, { status: 200 });
  }

  const messageCreatedAt = new Date(mostRecentMessage.createdAt);
  const secondsSinceMessage = differenceInSeconds(
    resumeRequestedAt,
    messageCreatedAt
  );

  if (secondsSinceMessage > RESUME_THRESHOLD_SECONDS) {
    return new Response(emptyDataStream, { status: 200 });
  }

  const restoredStream = createRestoredStream(mostRecentMessage as ChatMessage);
  return new Response(
    restoredStream.pipeThrough(new JsonToSseTransformStream()),
    { status: 200 }
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth.api.getSession(req);

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    await validateChatAccess(chatId, session);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    throw error;
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const emptyDataStream = createEmptyDataStream();

  const stream = await streamContext.resumableStream(recentStreamId, () =>
    emptyDataStream.pipeThrough(new JsonToSseTransformStream())
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    return handleStreamResumption(chatId, resumeRequestedAt, emptyDataStream);
  }

  return new Response(stream, { status: 200 });
}
