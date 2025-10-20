// Force dynamic rendering to access headers
export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/app/actions";
import PricingTable from "./_component/pricing-table";

export default async function PricingPage() {
  const user = await getCurrentUser();

  // Fetch live price from Polar (server-side, cached)
  const linkId = process.env.POLAR_CHECKOUT_LINK_ID as string | undefined;
  let priceUSD: number | undefined;
  const token = process.env.POLAR_ACCESS_TOKEN;
  const endpoints = [
    "https://api.polar.sh/v1",
    "https://sandbox-api.polar.sh/v1",
  ];

  async function tryFetch(url: string) {
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
  }

  try {
    if (linkId && token) {
      // Prefer fetching via Checkout Link (ties to allow_discount_codes, etc.)
      for (const base of endpoints) {
        const res = await tryFetch(`${base}/checkout-links/${linkId}`);
        if (res.ok) {
          const link = await res.json();
          const p = link?.products?.[0]?.prices?.[0];
          if (p?.price_amount) {
            priceUSD = Math.round(p.price_amount / 100);
          }
          break;
        }
      }
    }

    // Fallback: fetch from products if no linkId or previous calls failed
    if (!priceUSD && token) {
      const productId = process.env.NEXT_PUBLIC_STARTER_TIER as string;
      for (const base of endpoints) {
        const res = await tryFetch(`${base}/products`);
        if (!res.ok) {
          continue;
        }
        const data = await res.json();
        const items = data.items || [];
        const prod = items.find((i: any) => i?.id === productId);
        const prices = prod?.prices || [];
        const chosen =
          prices.find(
            (p: any) =>
              (p.recurring_interval === "month" || p.type === "recurring") &&
              String(p.price_currency).toUpperCase() === "USD"
          ) || prices[0];
        if (chosen?.price_amount) {
          priceUSD = Math.round(chosen.price_amount / 100);
          break;
        }
      }
    }
  } catch (_) {
    // swallow; fallback handled in component
  }

  // Extract subscription details from unified user data
  const subscriptionDetails = user?.polarSubscription
    ? {
        hasSubscription: true,
        subscription: {
          ...user.polarSubscription,
          organizationId: null,
        },
      }
    : { hasSubscription: false };

  return (
    <div className="w-full">
      <PricingTable
        priceUSD={priceUSD}
        subscriptionDetails={subscriptionDetails}
        user={user}
      />
    </div>
  );
}
