import {
  boolean,
  foreignKey,
  integer,
  json,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const verification = pgTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export const user = pgTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean("email_verified").notNull(),
    image: text(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
  },
  (table) => [unique("user_email_unique").on(table.email)]
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey().notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      mode: "string",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      mode: "string",
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "account_user_id_user_id_fk",
    }).onDelete("cascade"),
  ]
);

export const chat = pgTable(
  "chat",
  {
    id: text().primaryKey().notNull(),
    userId: text().notNull(),
    title: text().default("New Chat").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    visibility: varchar().default("private").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "chat_userId_user_id_fk",
    }),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    token: text().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_user_id_user_id_fk",
    }).onDelete("cascade"),
    unique("session_token_unique").on(table.token),
  ]
);

export const stream = pgTable(
  "stream",
  {
    id: text().primaryKey().notNull(),
    chatId: text().notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
      name: "stream_chatId_chat_id_fk",
    }).onDelete("cascade"),
  ]
);

export const subscription = pgTable(
  "subscription",
  {
    id: text().primaryKey().notNull(),
    createdAt: timestamp({ mode: "string" }).notNull(),
    modifiedAt: timestamp({ mode: "string" }),
    amount: integer().notNull(),
    currency: text().notNull(),
    recurringInterval: text().notNull(),
    status: text().notNull(),
    currentPeriodStart: timestamp({ mode: "string" }).notNull(),
    currentPeriodEnd: timestamp({ mode: "string" }).notNull(),
    cancelAtPeriodEnd: boolean().default(false).notNull(),
    canceledAt: timestamp({ mode: "string" }),
    startedAt: timestamp({ mode: "string" }).notNull(),
    endsAt: timestamp({ mode: "string" }),
    endedAt: timestamp({ mode: "string" }),
    customerId: text().notNull(),
    productId: text().notNull(),
    checkoutId: text().notNull(),
    customerCancellationReason: text(),
    customerCancellationComment: text(),
    metadata: text(),
    customFieldData: text(),
    userId: text(),
    trialStart: timestamp({ mode: "string" }),
    trialEnd: timestamp({ mode: "string" }),
    recurringIntervalCount: integer().default(1).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "subscription_userId_user_id_fk",
    }),
  ]
);

export const message = pgTable(
  "message",
  {
    id: text().primaryKey().notNull(),
    chatId: text("chat_id").notNull(),
    role: text().notNull(),
    parts: json().notNull(),
    attachments: json().notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    model: text(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    completionTime: real("completion_time"),
  },
  (table) => [
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
      name: "message_chat_id_chat_id_fk",
    }).onDelete("cascade"),
  ]
);

export const messageUsage = pgTable(
  "message_usage",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    messageCount: integer("message_count").default(0).notNull(),
    date: timestamp({ mode: "string" }).defaultNow().notNull(),
    resetAt: timestamp("reset_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "message_usage_user_id_user_id_fk",
    }).onDelete("cascade"),
  ]
);

export const customInstructions = pgTable(
  "custom_instructions",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    content: text().notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "custom_instructions_user_id_user_id_fk",
    }).onDelete("cascade"),
  ]
);

export const lookout = pgTable(
  "lookout",
  {
    id: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    title: text().notNull(),
    prompt: text().notNull(),
    frequency: text().notNull(),
    cronSchedule: text("cron_schedule").notNull(),
    timezone: text().default("UTC").notNull(),
    nextRunAt: timestamp("next_run_at", { mode: "string" }).notNull(),
    qstashScheduleId: text("qstash_schedule_id"),
    status: text().default("active").notNull(),
    lastRunAt: timestamp("last_run_at", { mode: "string" }),
    lastRunChatId: text("last_run_chat_id"),
    runHistory: json("run_history").default([]),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "lookout_user_id_user_id_fk",
    }).onDelete("cascade"),
  ]
);

export const extractedPage = pgTable(
  "extracted_page",
  {
    id: text().primaryKey().notNull(),
    extractionId: text("extraction_id").notNull(),
    userId: text("user_id").notNull(),
    url: text().notNull(),
    title: text().notNull(),
    metaDescription: text("meta_description"),
    h1: text(),
    content: text().notNull(),
    wordCount: integer("word_count").notNull(),
    metadata: json(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "extracted_page_user_id_user_id_fk",
    }).onDelete("cascade"),
  ]
);

export const pageAnalysis = pgTable(
  "page_analysis",
  {
    id: text().primaryKey().notNull(),
    pageId: text("page_id").notNull(),
    introWordCount: integer("intro_word_count").notNull(),
    fleschScore: real("flesch_score").notNull(),
    headings: json().notNull(),
    keywordFrequencies: json("keyword_frequencies"),
    entities: json(),
    semanticKeywords: json("semantic_keywords"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.pageId],
      foreignColumns: [extractedPage.id],
      name: "page_analysis_page_id_extracted_page_id_fk",
    }).onDelete("cascade"),
  ]
);
