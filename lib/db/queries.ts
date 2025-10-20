import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { ChatSDKError } from "../errors";
import { db, maindb } from "./index";
import {
  type Chat,
  chat,
  customInstructions,
  extremeSearchUsage,
  lookout,
  type Message,
  message,
  messageUsage,
  stream,
  type User,
  user,
} from "./schema";

type VisibilityType = "public" | "private";

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .$withCache();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const [selectedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .$withCache();
    return selectedUser || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get user by id");
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    // Use maindb for writes to avoid replica lag
    return await maindb.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError(
      "bad_request:database",
      `Failed to save chat${error}`
    );
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    // Use maindb to avoid replica lag for recently created chats
    const query = (whereCondition?: SQL<any>) =>
      maindb
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await maindb
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await maindb
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    // Use maindb to avoid replica lag for recently created chats
    const [selectedChat] = await maindb
      .select()
      .from(chat)
      .where(eq(chat.id, id));
    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function getChatWithUserById({ id }: { id: string }) {
  try {
    const [result] = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        visibility: chat.visibility,
        userId: chat.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(eq(chat.id, id))
      .$withCache();
    return result;
  } catch (_error) {
    return null;
  }
}

export async function saveMessages({ messages }: { messages: Message[] }) {
  try {
    // Use maindb for writes to avoid replica lag
    return await maindb.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({
  id,
  limit = 50,
  offset = 0,
}: {
  id: string;
  limit?: number;
  offset?: number;
}) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
      .limit(limit)
      .offset(offset)
      .$withCache();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    const result = await db
      .update(chat)
      .set({ visibility })
      .where(eq(chat.id, chatId));

    // Return a consistent, serializable structure
    return {
      success: true,
      rowCount: result.rowCount || 0,
      chatId,
      visibility,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    const [updatedChat] = await db
      .update(chat)
      .set({ title, updatedAt: new Date() })
      .where(eq(chat.id, chatId))
      .returning();
    return updatedChat;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat title by id"
    );
  }
}

export async function getMessageCountByUserId({ id }: { id: string }) {
  try {
    return await getMessageCount({ userId: id });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export async function getExtremeSearchUsageByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    const now = new Date();
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Start of next month
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    startOfNextMonth.setHours(0, 0, 0, 0);

    const [usage] = await db
      .select()
      .from(extremeSearchUsage)
      .where(
        and(
          eq(extremeSearchUsage.userId, userId),
          gte(extremeSearchUsage.date, startOfMonth),
          lt(extremeSearchUsage.date, startOfNextMonth)
        )
      )
      .limit(1);

    return usage;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get extreme search usage"
    );
  }
}

export async function incrementExtremeSearchUsage({
  userId,
}: {
  userId: string;
}) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End of current month for monthly reset
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);

    const existingUsage = await getExtremeSearchUsageByUserId({ userId });

    if (existingUsage) {
      const [updatedUsage] = await db
        .update(extremeSearchUsage)
        .set({
          searchCount: existingUsage.searchCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(extremeSearchUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    }
    const [newUsage] = await db
      .insert(extremeSearchUsage)
      .values({
        userId,
        searchCount: 1,
        date: today,
        resetAt: endOfMonth,
      })
      .returning();
    return newUsage;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to increment extreme search usage"
    );
  }
}

export async function getExtremeSearchCount({
  userId,
}: {
  userId: string;
}): Promise<number> {
  try {
    const usage = await getExtremeSearchUsageByUserId({ userId });
    return usage?.searchCount || 0;
  } catch (_error) {
    return 0;
  }
}

export async function getMessageUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    // Start of current day
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    startOfDay.setHours(0, 0, 0, 0);

    // Start of next day
    const startOfNextDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    startOfNextDay.setHours(0, 0, 0, 0);

    const [usage] = await db
      .select()
      .from(messageUsage)
      .where(
        and(
          eq(messageUsage.userId, userId),
          gte(messageUsage.date, startOfDay),
          lt(messageUsage.date, startOfNextDay)
        )
      )
      .limit(1);

    return usage;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message usage"
    );
  }
}

export async function incrementMessageUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End of current day for daily reset
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    endOfDay.setHours(0, 0, 0, 0);

    // Clean up previous day entries for this user
    await db
      .delete(messageUsage)
      .where(
        and(eq(messageUsage.userId, userId), lt(messageUsage.date, today))
      );

    const existingUsage = await getMessageUsageByUserId({ userId });

    if (existingUsage) {
      const [updatedUsage] = await db
        .update(messageUsage)
        .set({
          messageCount: existingUsage.messageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(messageUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    }
    const [newUsage] = await db
      .insert(messageUsage)
      .values({
        userId,
        messageCount: 1,
        date: today,
        resetAt: endOfDay,
      })
      .returning();
    return newUsage;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to increment message usage"
    );
  }
}

export async function getMessageCount({
  userId,
}: {
  userId: string;
}): Promise<number> {
  try {
    const usage = await getMessageUsageByUserId({ userId });
    return usage?.messageCount || 0;
  } catch (_error) {
    return 0;
  }
}

export async function getHistoricalUsageData({
  userId,
  months = 6,
}: {
  userId: string;
  months?: number;
}) {
  try {
    // Get actual message data for the specified months from message table
    const totalDays = months * 30; // Approximately 30 days per month
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (totalDays - 1)); // totalDays - 1 + today

    // Get all user messages from their chats in the date range
    const historicalMessages = await db
      .select({
        createdAt: message.createdAt,
        role: message.role,
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          eq(message.role, "user"), // Only count user messages, not assistant responses
          gte(message.createdAt, startDate),
          lt(message.createdAt, endDate)
        )
      )
      .orderBy(asc(message.createdAt))
      .$withCache();

    // Group messages by date and count them
    const dailyCounts = new Map<string, number>();

    historicalMessages.forEach((msg) => {
      const dateKey = msg.createdAt.toISOString().split("T")[0]; // Get YYYY-MM-DD format
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });

    // Convert to array format expected by the frontend
    const result = Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date: new Date(date),
      messageCount: count,
    }));

    return result;
  } catch (_error) {
    return [];
  }
}

// Custom Instructions CRUD operations
export async function getCustomInstructionsByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    const [instructions] = await db
      .select()
      .from(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .limit(1)
      .$withCache();

    return instructions;
  } catch (_error) {
    return null;
  }
}

export async function createCustomInstructions({
  userId,
  content,
}: {
  userId: string;
  content: string;
}) {
  try {
    const [newInstructions] = await db
      .insert(customInstructions)
      .values({
        userId,
        content,
      })
      .returning();

    return newInstructions;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create custom instructions"
    );
  }
}

export async function updateCustomInstructions({
  userId,
  content,
}: {
  userId: string;
  content: string;
}) {
  try {
    const [updatedInstructions] = await db
      .update(customInstructions)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(customInstructions.userId, userId))
      .returning();

    return updatedInstructions;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update custom instructions"
    );
  }
}

export async function deleteCustomInstructions({ userId }: { userId: string }) {
  try {
    const [deletedInstructions] = await db
      .delete(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .returning();

    return deletedInstructions;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete custom instructions"
    );
  }
}

// Lookout CRUD operations
export async function createLookout({
  userId,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
}: {
  userId: string;
  title: string;
  prompt: string;
  frequency: string;
  cronSchedule: string;
  timezone: string;
  nextRunAt: Date;
  qstashScheduleId?: string;
}) {
  try {
    const [newLookout] = await db
      .insert(lookout)
      .values({
        userId,
        title,
        prompt,
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
        qstashScheduleId,
      })
      .returning();
    return newLookout;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create lookout");
  }
}

export async function getLookoutsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(lookout)
      .where(eq(lookout.userId, userId))
      .orderBy(desc(lookout.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get lookouts by user id"
    );
  }
}

export async function getLookoutById({ id }: { id: string }) {
  try {
    const [selectedLookout] = await db
      .select()
      .from(lookout)
      .where(eq(lookout.id, id));

    if (selectedLookout) {
    } else {
    }

    return selectedLookout;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get lookout by id"
    );
  }
}

export async function updateLookout({
  id,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
}: {
  id: string;
  title?: string;
  prompt?: string;
  frequency?: string;
  cronSchedule?: string;
  timezone?: string;
  nextRunAt?: Date;
  qstashScheduleId?: string;
}) {
  try {
    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) {
      updateData.title = title;
    }
    if (prompt !== undefined) {
      updateData.prompt = prompt;
    }
    if (frequency !== undefined) {
      updateData.frequency = frequency;
    }
    if (cronSchedule !== undefined) {
      updateData.cronSchedule = cronSchedule;
    }
    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }
    if (nextRunAt !== undefined) {
      updateData.nextRunAt = nextRunAt;
    }
    if (qstashScheduleId !== undefined) {
      updateData.qstashScheduleId = qstashScheduleId;
    }

    const [updatedLookout] = await db
      .update(lookout)
      .set(updateData)
      .where(eq(lookout.id, id))
      .returning();

    return updatedLookout;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update lookout");
  }
}

export async function updateLookoutStatus({
  id,
  status,
}: {
  id: string;
  status: "active" | "paused" | "archived" | "running";
}) {
  try {
    const [updatedLookout] = await db
      .update(lookout)
      .set({ status, updatedAt: new Date() })
      .where(eq(lookout.id, id))
      .returning();

    return updatedLookout;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update lookout status"
    );
  }
}

export async function updateLookoutLastRun({
  id,
  lastRunAt,
  lastRunChatId,
  nextRunAt,
  runStatus = "success",
  error,
  duration,
  tokensUsed,
  searchesPerformed,
}: {
  id: string;
  lastRunAt: Date;
  lastRunChatId: string;
  nextRunAt?: Date;
  runStatus?: "success" | "error" | "timeout";
  error?: string;
  duration?: number;
  tokensUsed?: number;
  searchesPerformed?: number;
}) {
  try {
    // Get current lookout to append to run history
    const currentLookout = await getLookoutById({ id });
    if (!currentLookout) {
      throw new Error("Lookout not found");
    }

    const currentHistory = (currentLookout.runHistory as any[]) || [];

    // Add new run to history
    const newRun = {
      runAt: lastRunAt.toISOString(),
      chatId: lastRunChatId,
      status: runStatus,
      ...(error && { error }),
      ...(duration && { duration }),
      ...(tokensUsed && { tokensUsed }),
      ...(searchesPerformed && { searchesPerformed }),
    };

    // Keep only last 100 runs to prevent unbounded growth
    const updatedHistory = [...currentHistory, newRun].slice(-100);

    const updateData: any = {
      lastRunAt,
      lastRunChatId,
      runHistory: updatedHistory,
      updatedAt: new Date(),
    };
    if (nextRunAt) {
      updateData.nextRunAt = nextRunAt;
    }

    const [updatedLookout] = await db
      .update(lookout)
      .set(updateData)
      .where(eq(lookout.id, id))
      .returning();

    return updatedLookout;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update lookout last run"
    );
  }
}

// New function to get run statistics
export async function getLookoutRunStats({ id }: { id: string }) {
  try {
    const lookout = await getLookoutById({ id });
    if (!lookout) {
      return null;
    }

    const runHistory = (lookout.runHistory as any[]) || [];

    return {
      totalRuns: runHistory.length,
      successfulRuns: runHistory.filter((run) => run.status === "success")
        .length,
      failedRuns: runHistory.filter((run) => run.status === "error").length,
      averageDuration:
        runHistory.reduce((sum, run) => sum + (run.duration || 0), 0) /
          runHistory.length || 0,
      lastWeekRuns: runHistory.filter(
        (run) =>
          new Date(run.runAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
    };
  } catch (_error) {
    return null;
  }
}

export async function deleteLookout({ id }: { id: string }) {
  try {
    const [deletedLookout] = await db
      .delete(lookout)
      .where(eq(lookout.id, id))
      .returning();

    return deletedLookout;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete lookout");
  }
}
