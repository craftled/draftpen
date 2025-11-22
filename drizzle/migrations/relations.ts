import { relations } from "drizzle-orm/relations";
import {
  account,
  chat,
  customInstructions,
  extractedPage,
  lookout,
  message,
  messageUsage,
  pageAnalysis,
  session,
  stream,
  subscription,
  user,
} from "./schema";

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  chats: many(chat),
  sessions: many(session),
  subscriptions: many(subscription),
  messageUsages: many(messageUsage),
  customInstructions: many(customInstructions),
  lookouts: many(lookout),
  extractedPages: many(extractedPage),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  streams: many(stream),
  messages: many(message),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const streamRelations = relations(stream, ({ one }) => ({
  chat: one(chat, {
    fields: [stream.chatId],
    references: [chat.id],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));

export const messageUsageRelations = relations(messageUsage, ({ one }) => ({
  user: one(user, {
    fields: [messageUsage.userId],
    references: [user.id],
  }),
}));

export const customInstructionsRelations = relations(
  customInstructions,
  ({ one }) => ({
    user: one(user, {
      fields: [customInstructions.userId],
      references: [user.id],
    }),
  })
);

export const lookoutRelations = relations(lookout, ({ one }) => ({
  user: one(user, {
    fields: [lookout.userId],
    references: [user.id],
  }),
}));

export const extractedPageRelations = relations(
  extractedPage,
  ({ one, many }) => ({
    user: one(user, {
      fields: [extractedPage.userId],
      references: [user.id],
    }),
    pageAnalyses: many(pageAnalysis),
  })
);

export const pageAnalysisRelations = relations(pageAnalysis, ({ one }) => ({
  extractedPage: one(extractedPage, {
    fields: [pageAnalysis.pageId],
    references: [extractedPage.id],
  }),
}));
