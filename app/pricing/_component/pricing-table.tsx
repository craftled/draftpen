"use client";

import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ProAccordion,
  ProAccordionContent,
  ProAccordionItem,
  ProAccordionTrigger,
} from "@/components/ui/pro-accordion";
import { authClient } from "@/lib/auth-client";
import { PRICING } from "@/lib/constants";

import type { ComprehensiveUserData } from "@/lib/user-data-server";

type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  recurringIntervalCount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

type PricingTableProps = {
  subscriptionDetails: SubscriptionDetailsResult;
  user: ComprehensiveUserData | null;
  priceUSD?: number; // from server (Polar), optional fallback to PRICING
};

const FAQ_ITEMS = [
  {
    value: "item-1",
    question: "What is Draftpen?",
    answer:
      "Draftpen is an AI-first content writing platform that helps you research and draft human-level content. It combines powerful AI models with live research tools, document connectors, and long-term memory to streamline your writing workflow.",
  },
  {
    value: "item-2",
    question: "What's included in the subscription?",
    answer:
      "Draftpen Pro costs $99/month with a 7-day free trial. You get unlimited AI-powered writing and research, access to all premium AI models (GPT-5.1, GPT-5 nano, and Claude 4.5 Sonnet), PDF and document analysis, web research with real-time data, scheduled research automation (Lookouts), and priority support.",
  },
  {
    value: "item-3",
    question: "Are there any discounts available?",
    answer:
      "We occasionally offer discount codes for special promotions. You can apply any available discount codes during checkout through Polar.",
  },
  {
    value: "item-4",
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel your Pro subscription at any time. Your benefits will continue until the end of your current billing period.",
  },
  {
    value: "item-5",
    question: "What AI models does Draftpen support?",
    answer:
      "Draftpen supports multiple advanced AI models including OpenAI GPT-5.1, GPT-5 nano, and Anthropic Claude 4.5 Sonnet. You can switch between models to find the best fit for your writing task.",
  },
  {
    value: "item-6",
    question: "How does Draftpen help with research?",
    answer:
      "Draftpen includes integrated research tools like web search, academic search, YouTube and Reddit lookups, keyword research with SEO metrics, and the ability to sync your Google Drive and Notion workspaces. All research results are automatically cited and can be used directly in your writing.",
  },
] as const;

export default function PricingTable({
  subscriptionDetails,
  user,
  priceUSD,
}: PricingTableProps) {
  const router = useRouter();

  const handleCheckout = async (productId: string, slug: string) => {
    if (!user) {
      toast.info("Please sign in to start your free trial");
      router.push("/sign-up");
      return;
    }

    try {
      await authClient.checkout({
        products: [productId],
        slug,
        allowDiscountCodes: true,
      });
    } catch (_error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (_error) {
      toast.error("Failed to open subscription management");
    }
  };

  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;

  if (!(STARTER_TIER && STARTER_SLUG)) {
    throw new Error("Missing required environment variables for Starter tier");
  }

  // Check if user has active Polar subscription (includes trialing)
  const hasPolarSubscription = () => {
    const sub = subscriptionDetails.subscription;
    if (!(subscriptionDetails.hasSubscription && sub)) {
      return false;
    }
    const now = new Date();
    return (
      sub.productId === STARTER_TIER &&
      (sub.status === "active" || sub.status === "trialing") &&
      new Date(sub.currentPeriodEnd) > now
    );
  };

  // Check if user has any Pro status (Polar only)
  const hasProAccess = () => hasPolarSubscription();

  // Get the source of Pro access for display
  const getProAccessSource = () => {
    if (hasPolarSubscription()) {
      return "polar";
    }
    return null;
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="mx-auto max-w-4xl px-6 pt-12">
        <Link
          className="mb-8 inline-flex items-center text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-16 text-center">
          <h1 className="mb-4 font-medium font-sans text-4xl text-foreground">
            Pricing
          </h1>
          <p className="text-muted-foreground text-xl">
            Choose the plan that works for you
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="mx-auto grid max-w-3xl grid-cols-1 place-items-center">
          {/* Pro Plan */}
          <Card className="relative w-full max-w-md border-2 border-primary">
            {hasProAccess() && (
              <div className="-top-3 -translate-x-1/2 absolute left-1/2 z-10 transform">
                <Badge className="bg-primary text-primary-foreground">
                  Current plan
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-xl">Draftpen Pro</h3>
                <Badge variant="secondary">7-day free trial</Badge>
              </div>

              {/* Pricing Display */}
              {(() => {
                const usd = priceUSD ?? PRICING.PRO_MONTHLY;
                return (
                  <div className="flex items-baseline">
                    <span className="font-light text-4xl">${usd}</span>
                    <span className="ml-2 text-muted-foreground">/month</span>
                  </div>
                );
              })()}
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Unlimited AI writing
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  All premium AI models
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Document & PDF analysis
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Live web research
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Scheduled research (Lookouts)
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Priority support
                </li>
              </ul>

              {hasProAccess() ? (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={handleManageSubscription}
                    type="button"
                  >
                    Manage subscription
                  </Button>
                  {getProAccessSource() === "polar" &&
                    subscriptionDetails.subscription && (
                      <p className="text-center text-muted-foreground text-sm">
                        {subscriptionDetails.subscription.cancelAtPeriodEnd
                          ? `Subscription expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                          : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                      </p>
                    )}
                </div>
              ) : (
                <Button
                  className="group w-full"
                  onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}
                  type="button"
                >
                  Start 7-day free trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <section className="mt-16 rounded-2xl border border-border/40 bg-muted/30 px-6 py-12">
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-semibold text-2xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Find answers to common questions about Draftpen
            </p>
          </div>

          <ProAccordion className="w-full" collapsible type="single">
            {FAQ_ITEMS.map(({ value, question, answer }) => (
              <ProAccordionItem key={value} value={value}>
                <ProAccordionTrigger>{question}</ProAccordionTrigger>
                <ProAccordionContent>{answer}</ProAccordionContent>
              </ProAccordionItem>
            ))}
          </ProAccordion>

          <div className="mt-10 space-y-6 text-center">
            <p className="text-muted-foreground">
              Have more questions?{" "}
              <a
                className="text-primary transition-colors hover:text-primary/80"
                href="mailto:support@draftpen.com"
              >
                Contact us
              </a>
            </p>

            <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-border/40 bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-medium text-foreground text-sm">
                  Ready to get started?
                </p>
                <p className="text-muted-foreground text-xs">
                  Start writing better content with Draftpen
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  className="w-full px-4 py-2 text-sm sm:w-auto"
                  onClick={() => router.push("/")}
                  size="sm"
                  type="button"
                >
                  Start now
                  <Search className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  className="w-full px-4 py-2 text-sm sm:w-auto"
                  onClick={() => router.push("/pricing")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  View pricing
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            By subscribing, you agree to our{" "}
            <Link className="text-foreground hover:underline" href="/terms">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="text-foreground hover:underline"
              href="/privacy-policy"
            >
              Privacy Policy
            </Link>
          </p>
          <p className="text-muted-foreground text-sm">
            Questions?{" "}
            <a
              className="text-foreground hover:underline"
              href="mailto:support@draftpen.com"
            >
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
