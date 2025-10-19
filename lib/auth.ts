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
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  // Force production server even in development to match token
});

export const auth = betterAuth({
  rateLimit: {
    max: 50,
    window: 60,
  },
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,
  },
  onAPIError: {
    throw: true,
    errorURL: "/auth/error",
    onError: (error) => {
      // Avoid leaking multi-line messages into headers; log succinctly
      console.error("[Better Auth]:", (error as any)?.message ?? error);
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
      mapProfileToUser: (profile: any) => {
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
              console.log(
                "🚀 getCustomerCreateParams called for user:",
                newUser.id
              );

              try {
                // Look for existing customer by email
                const { result: existingCustomers } =
                  await polarClient.customers.list({
                    email: newUser.email,
                  });

                const existingCustomer = existingCustomers.items[0];

                if (
                  existingCustomer &&
                  existingCustomer.externalId &&
                  existingCustomer.externalId !== newUser.id
                ) {
                  console.log(
                    `🔗 Found existing customer ${existingCustomer.id} with external ID ${existingCustomer.externalId}`
                  );
                  console.log(
                    `🔄 Updating user ID from ${newUser.id} to ${existingCustomer.externalId}`
                  );

                  // Update the user's ID in database to match the existing external ID
                  if (newUser.id) {
                    await db
                      .update(user)
                      .set({ id: existingCustomer.externalId })
                      .where(eq(user.id, newUser.id));
                  } else {
                    console.error(
                      "Missing newUser.id; skipping user ID update to existing external ID"
                    );
                  }

                  console.log(
                    `✅ Updated user ID to match existing external ID: ${existingCustomer.externalId}`
                  );
                }

                return {};
              } catch (error) {
                console.error("💥 Error in getCustomerCreateParams:", error);
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
                    console.log("🎯 Processing subscription webhook:", type);
                    console.log(
                      "📦 Payload data:",
                      JSON.stringify(data, null, 2)
                    );

                    try {
                      // STEP 1: Extract user ID from customer data
                      const userId = data.customer?.externalId;

                      // STEP 1.5: Check if user exists to prevent foreign key violations
                      // Also preserve existing userId if not found in webhook (for updates)
                      let validUserId = null;
                      if (userId) {
                        try {
                          const userExists = await db.query.user.findFirst({
                            where: eq(user.id, userId),
                            columns: { id: true },
                          });
                          validUserId = userExists ? userId : null;

                          if (!userExists) {
                            console.warn(
                              `⚠️ User ${userId} not found, creating subscription without user link - will auto-link when user signs up`
                            );
                          }
                        } catch (error) {
                          console.error(
                            "Error checking user existence:",
                            error
                          );
                        }
                      } else {
                        // No external ID in webhook - check if subscription already exists with a userId
                        console.warn(
                          "🚨 No external ID found in webhook, checking existing subscription"
                        );
                        try {
                          const existing =
                            await db.query.subscription.findFirst({
                              where: eq(subscription.id, data.id),
                              columns: { userId: true },
                            });
                          if (existing?.userId) {
                            console.log(
                              `✅ Preserving existing userId: ${existing.userId}`
                            );
                            validUserId = existing.userId;
                          }
                        } catch (error) {
                          console.error(
                            "Error checking existing subscription:",
                            error
                          );
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
                              console.log(
                                `🔗 Fallback linking by email: ${customerEmail} -> ${userByEmail.id}`
                              );
                              validUserId = userByEmail.id;
                            }
                          }
                        } catch (e) {
                          console.warn(
                            "Email-based fallback linking failed:",
                            e
                          );
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
                        trialStart: safeParseDate((data as any).trial_start),
                        trialEnd: safeParseDate((data as any).trial_end),
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

                      console.log("💾 Final subscription data:", {
                        id: subscriptionData.id,
                        status: subscriptionData.status,
                        userId: subscriptionData.userId,
                        trialStart: subscriptionData.trialStart,
                        trialEnd: subscriptionData.trialEnd,
                      });

                      // Debug: Log raw data to see what Polar sends
                      console.log("🔍 Raw webhook data (trial fields):", {
                        trialStart: data.trialStart,
                        trialEnd: data.trialEnd,
                        trial_start: (data as any).trial_start,
                        trial_end: (data as any).trial_end,
                        amount: subscriptionData.amount,
                      });

                      // STEP 3: Use Drizzle's onConflictDoUpdate for proper upsert
                      // IMPORTANT: Only update userId if we have a valid one (don't overwrite with NULL)
                      const updateSet: any = {
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

                      console.log("✅ Upserted subscription:", data.id);

                      // Invalidate user caches when subscription changes
                      if (validUserId) {
                        invalidateUserCaches(validUserId);
                        clearUserDataCache(validUserId);
                        console.log(
                          "🗑️ Invalidated caches for user:",
                          validUserId
                        );
                      }
                    } catch (error) {
                      console.error(
                        "💥 Error processing subscription webhook:",
                        error
                      );
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
