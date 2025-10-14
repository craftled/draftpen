'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PRICING } from '@/lib/constants';



import { ComprehensiveUserData } from '@/lib/user-data-server';



type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
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
  errorType?: 'CANCELED' | 'EXPIRED' | 'GENERAL';
};

interface PricingTableProps {
  subscriptionDetails: SubscriptionDetailsResult;
  user: ComprehensiveUserData | null;
  priceUSD?: number; // from server (Polar), optional fallback to PRICING
}

export default function PricingTable({ subscriptionDetails, user, priceUSD }: PricingTableProps) {
  const router = useRouter();
  // Debug logging (can be removed in production)
  console.log('PricingTable Debug:', {
    subscriptionDetails,
    userProStatus: user
      ? {
          id: user.id,
          isProUser: user.isProUser,
          proSource: user.proSource,
          hasPolarSubscription: !!user.polarSubscription,
          polarSubStatus: user.polarSubscription?.status,
          polarSubProductId: user.polarSubscription?.productId,
        }
      : null,
  });



  const handleCheckout = async (productId: string, slug: string) => {
    console.log('🛒 Checkout initiated:', { productId, slug, hasUser: !!user });
    
    if (!user) {
      console.log('❌ No user, redirecting to sign-up');
      toast.info('Please sign in to start your free trial');
      router.push('/sign-up');
      return;
    }

    try {
      console.log('📦 Opening checkout with authClient.checkout()...');
      await authClient.checkout({
        products: [productId],
        slug,
        allowDiscountCodes: true,
      });
      console.log('✅ Checkout opened successfully');
    } catch (error) {
      console.error('❌ Checkout failed:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;

  if (!STARTER_TIER || !STARTER_SLUG) {
    console.error('Missing required environment variables');
    throw new Error('Missing required environment variables for Starter tier');
  }

  // Check if user has active Polar subscription (includes trialing)
  const hasPolarSubscription = () => {
    const sub = subscriptionDetails.subscription;
    if (!subscriptionDetails.hasSubscription || !sub) return false;
    const now = new Date();
    return (
      sub.productId === STARTER_TIER &&
      (sub.status === 'active' || sub.status === 'trialing') &&
      new Date(sub.currentPeriodEnd) > now
    );
  };

  

  // Check if user has any Pro status (Polar only)
  const hasProAccess = () => {
    return hasPolarSubscription();
  };

  // Get the source of Pro access for display
  const getProAccessSource = () => {
    if (hasPolarSubscription()) return 'polar';
    return null;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-medium text-foreground mb-4 font-be-vietnam-pro">Pricing</h1>
          <p className="text-xl text-muted-foreground">Choose the plan that works for you</p>
        </div>
      </div>


      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 place-items-center max-w-3xl mx-auto">


          {/* Pro Plan */}
          <Card className="relative border-2 border-primary w-full max-w-md">
            {hasProAccess() && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-primary text-primary-foreground">Current plan</Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Draftpen Pro</h3>
                <Badge variant="secondary">7-day free trial</Badge>
              </div>

              {/* Pricing Display */}
              {(() => {
                const usd = priceUSD ?? PRICING.PRO_MONTHLY;
                return (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-light">${usd}</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                );
              })()}
            </CardHeader>

            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  Unlimited searches
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  All AI models
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  PDF analysis
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  Priority support
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                  Scira Lookout
                </li>
              </ul>

              {hasProAccess() ? (
                <div className="space-y-4">
                  <Button className="w-full" onClick={handleManageSubscription}>
                    Manage subscription
                  </Button>
                  {getProAccessSource() === 'polar' && subscriptionDetails.subscription && (
                    <p className="text-sm text-muted-foreground text-center">
                      {subscriptionDetails.subscription.cancelAtPeriodEnd
                        ? `Subscription expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                        : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                    </p>
                  )}

                </div>
              ) : (
                <Button className="w-full group" onClick={() => handleCheckout(STARTER_TIER, STARTER_SLUG)}>
                  Start 7-day free trial
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Footer */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-sm text-muted-foreground">
            By subscribing, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="text-foreground hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Questions?{' '}
            <a href="mailto:zaid@scira.ai" className="text-foreground hover:underline">
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
