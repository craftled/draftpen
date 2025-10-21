import {
  checkout,
  polar,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { serverEnv } from "@/env/server";
import { db, maindb } from "@/lib/db";
import {
  account,
  chat,
  customInstructions,
  extremeSearchUsage,
  lookout,
  message,
  messageUsage,
  session,
  stream,
  subscription,
  user,
  verification,
} from "@/lib/db/schema";
import { invalidateUserCaches } from "./performance-cache";
import { clearUserDataCache } from "./user-data-server";

// Utility function to safely parse dates
function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Force production server even in development to match token
});

const FIVE_MINUTES_SECONDS = 300 as const;

export const auth = betterAuth({
  rateLimit: {
    max: 50,
    window: 60,
  },
  cookieCache: {
    enabled: true,
    maxAge: FIVE_MINUTES_SECONDS,
  },
  onAPIError: {
    throw: true,
    errorURL: "/auth/error",
    onError: (_error) => {
      // Intentionally ignored: errors are surfaced via throw and errorURL
    },
  },
  database: drizzleAdapter(maindb, {
    provider: "pg",
    schema: {
      user,
      session,
      verification,
      account,
      chat,
      message,
      extremeSearchUsage,
      messageUsage,
      subscription,
      customInstructions,
      stream,
      lookout,
    },
  }),
  socialProviders: {
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_APP_URL : "http://localhost:3000"}/api/auth/callback/google`,
      mapProfileToUser: (profile: {
        given_name?: string;
        family_name?: string;
        name?: string;
        email?: string;
        picture?: string;
      }) => {
        const nameFromParts = [profile?.given_name, profile?.family_name]
          .filter(Boolean)
          .join(" ");
        return {
          name: profile?.name || nameFromParts || "",
          email: profile?.email || "",
          image: profile?.picture || undefined,
        };
      },
    },
  },
  pluginRoutes: {
    autoNamespace: true,
  },
  plugins: [
    ...(process.env.POLAR_ACCESS_TOKEN
      ? [
          polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            enableCustomerPortal: true,
            getCustomerCreateParams: async ({ user: newUser }) => {
              try {
                // Look for existing customer by email
                const { result: existingCustomers } =
                  await polarClient.customers.list({
                    email: newUser.email,
                  });

                const existingCustomer = existingCustomers.items[0];

                if (
                  existingCustomer?.externalId &&
                  existingCustomer.externalId !== newUser.id
                ) {
                  // Update the user's ID in database to match the existing external ID
                  if (newUser.id) {
                    await db
                      .update(user)
                      .set({ id: existingCustomer.externalId })
                      .where(eq(user.id, newUser.id));
                  } else {
                    // No-op: user did not have an id to update
                  }
                }

                return {};
              } catch (_error) {
                return {};
              }
            },
            use: [
              checkout({
                products: [
                  {
                    productId:
                      process.env.NEXT_PUBLIC_STARTER_TIER ||
                      (() => {
                        throw new Error(
                          "NEXT_PUBLIC_STARTER_TIER environment variable is required"
                        );
                      })(),
                    slug:
                      process.env.NEXT_PUBLIC_STARTER_SLUG ||
                      (() => {
                        throw new Error(
                          "NEXT_PUBLIC_STARTER_SLUG environment variable is required"
                        );
                      })(),
                  },
                ],
                successUrl: "/success",
                authenticatedUsersOnly: true,
              }),
              portal(),
              usage(),
              webhooks({
                secret:
                  process.env.POLAR_WEBHOOK_SECRET ||
                  (() => {
                    throw new Error(
                      "POLAR_WEBHOOK_SECRET environment variable is required"
                    );
                  })(),
                onPayload: async ({ data, type }) => {
                  if (
                    type === "subscription.created" ||
                    type === "subscription.active" ||
                    type === "subscription.canceled" ||
                    type === "subscription.revoked" ||
                    type === "subscription.uncanceled" ||
                    type === "subscription.updated"
                  ) {
                    try {
                      // STEP 1: Extract user ID from customer data
                      const userId = data.customer?.externalId;

                      // STEP 1.5: Check if user exists to prevent foreign key violations
                      // Also preserve existing userId if not found in webhook (for updates)
                      let validUserId: string | null = null;
                      if (userId) {
                        try {
                          const userExists = await db.query.user.findFirst({
                            where: eq(user.id, userId),
                            columns: { id: true },
                          });
                          validUserId = userExists ? userId : null;

                          if (!userExists) {
                            // No local user found for externalId; will try fallbacks
                          }
                        } catch (_error) {
                          // Swallow lookup errors; webhook processing continues with fallbacks
                        }
                      } else {
                        try {
                          const existing =
                            await db.query.subscription.findFirst({
                              where: eq(subscription.id, data.id),
                              columns: { userId: true },
                            });
                          if (existing?.userId) {
                            validUserId = existing.userId;
                          }
                        } catch (_error) {
                          // Swallow lookup errors; proceed to email-based fallback
                        }
                      }
                      // STEP 1.6: Fallback linking by email if externalId did not resolve a local user
                      if (!validUserId) {
                        try {
                          const customerEmail = data.customer?.email;
                          if (customerEmail) {
                            const userByEmail = await db.query.user.findFirst({
                              where: eq(user.email, customerEmail),
                              columns: { id: true },
                            });
                            if (userByEmail?.id) {
                              validUserId = userByEmail.id;
                            }
                          }
                        } catch (_e) {
                          // Swallow lookup errors; unable to resolve by email
                        }
                      }

                      // STEP 2: Build subscription data
                      const subscriptionData = {
                        id: data.id,
                        createdAt: new Date(data.createdAt),
                        modifiedAt: safeParseDate(data.modifiedAt),
                        amount: data.amount,
                        currency: data.currency,
                        recurringInterval: data.recurringInterval,
                        status: data.status,
                        currentPeriodStart:
                          safeParseDate(data.currentPeriodStart) || new Date(),
                        currentPeriodEnd:
                          safeParseDate(data.currentPeriodEnd) || new Date(),
                        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
                        canceledAt: safeParseDate(data.canceledAt),
                        startedAt: safeParseDate(data.startedAt) || new Date(),
                        endsAt: safeParseDate(data.endsAt),
                        endedAt: safeParseDate(data.endedAt),
                        trialStart: safeParseDate(
                          (data as { trial_start?: string | Date | null })
                            .trial_start
                        ),
                        trialEnd: safeParseDate(
                          (data as { trial_end?: string | Date | null })
                            .trial_end
                        ),
                        customerId: data.customerId,
                        productId: data.productId,
                        checkoutId: data.checkoutId || "",
                        customerCancellationReason:
                          data.customerCancellationReason || null,
                        customerCancellationComment:
                          data.customerCancellationComment || null,
                        metadata: data.metadata
                          ? JSON.stringify(data.metadata)
                          : null,
                        customFieldData: data.customFieldData
                          ? JSON.stringify(data.customFieldData)
                          : null,
                        userId: validUserId,
                      };

                      // STEP 3: Use Drizzle's onConflictDoUpdate for proper upsert
                      // IMPORTANT: Only update userId if we have a valid one (don't overwrite with NULL)
                      const updateSet: Partial<
                        typeof subscription.$inferInsert
                      > = {
                        modifiedAt: subscriptionData.modifiedAt || new Date(),
                        amount: subscriptionData.amount,
                        currency: subscriptionData.currency,
                        recurringInterval: subscriptionData.recurringInterval,
                        status: subscriptionData.status,
                        currentPeriodStart: subscriptionData.currentPeriodStart,
                        currentPeriodEnd: subscriptionData.currentPeriodEnd,
                        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
                        canceledAt: subscriptionData.canceledAt,
                        startedAt: subscriptionData.startedAt,
                        endsAt: subscriptionData.endsAt,
                        endedAt: subscriptionData.endedAt,
                        trialStart: subscriptionData.trialStart,
                        trialEnd: subscriptionData.trialEnd,
                        customerId: subscriptionData.customerId,
                        productId: subscriptionData.productId,
                        checkoutId: subscriptionData.checkoutId,
                        customerCancellationReason:
                          subscriptionData.customerCancellationReason,
                        customerCancellationComment:
                          subscriptionData.customerCancellationComment,
                        metadata: subscriptionData.metadata,
                        customFieldData: subscriptionData.customFieldData,
                      };

                      // Only update userId if we have a valid one (preserve existing if webhook doesn't have it)
                      if (subscriptionData.userId) {
                        updateSet.userId = subscriptionData.userId;
                      }

                      await db
                        .insert(subscription)
                        .values(subscriptionData)
                        .onConflictDoUpdate({
                          target: subscription.id,
                          set: updateSet,
                        });

                      // Invalidate user caches when subscription changes
                      if (validUserId) {
                        invalidateUserCaches(validUserId);
                        clearUserDataCache(validUserId);
                      }
                    } catch (_error) {
                      // Don't throw - let webhook succeed to avoid retries
                    }
                  }
                },
              }),
            ],
          }),
        ]
      : []),
    nextCookies(),
  ],
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://draftpen.com",
  ],
  allowedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://draftpen.com",
  ],
});
