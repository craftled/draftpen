"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
                  Unlimited searches
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  All AI models
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  PDF analysis
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Priority support
                </li>
                <li className="flex items-center">
                  <div className="mr-3 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Scira Lookout
                </li>
              </ul>

              {hasProAccess() ? (
                <div className="space-y-4">
                  <Button className="w-full" onClick={handleManageSubscription}>
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
                >
                  Start 7-day free trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

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
              href="mailto:zaid@scira.ai"
            >
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
