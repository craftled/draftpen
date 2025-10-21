type PolarPriceLike = {
  price_amount?: number;
  recurring_interval?: string;
  type?: string;
  price_currency?: string;
};

type PolarProductLike = {
  id?: string;
  prices?: PolarPriceLike[];
};

const CENTS_PER_DOLLAR = 100 as const;

export async function getPriceUSD(): Promise<number | undefined> {
  const linkId = process.env.POLAR_CHECKOUT_LINK_ID as string | undefined;
  const token = process.env.POLAR_ACCESS_TOKEN as string | undefined;
  const productId = process.env.NEXT_PUBLIC_STARTER_TIER as string | undefined;

  if (!token) {
    return;
  }

  const headers = { Authorization: `Bearer ${token}` } as const;
  const revalidate = { next: { revalidate: 3600 } } as const;
  const base = "https://api.polar.sh/v1"; // force production server

  try {
    if (linkId) {
      const res = await fetch(`${base}/checkout-links/${linkId}`, {
        headers,
        ...revalidate,
      });
      if (res.ok) {
        const link = await res.json();
        const p = link?.products?.[0]?.prices?.[0];
        if (p?.price_amount) {
          return Math.round(p.price_amount / CENTS_PER_DOLLAR);
        }
      }
    }
  } catch (_error) {
    // Best-effort: ignore transient API errors and fall through to next strategy
  }

  try {
    if (productId) {
      const res = await fetch(`${base}/products`, { headers, ...revalidate });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const items: PolarProductLike[] = data.items || [];
      const prod = items.find((i: PolarProductLike) => i?.id === productId);
      const prices = prod?.prices || [];
      const chosen =
        prices.find(
          (p: PolarPriceLike) =>
            (p.recurring_interval === "month" || p.type === "recurring") &&
            String(p.price_currency).toUpperCase() === "USD"
        ) || prices[0];
      if (chosen?.price_amount) {
        return Math.round(chosen.price_amount / CENTS_PER_DOLLAR);
      }
    }
  } catch (_error) {
    // Best-effort: ignore transient API errors
  }

  return;
}
