/*
  Polar setup helper: lists products, selects price for NEXT_PUBLIC_STARTER_TIER,
  creates a checkout link, and writes polar_setup_output.json with details.

  Usage: bun scripts/polar_setup.ts
*/

import { readFileSync, writeFileSync } from "node:fs";

function readEnvValue(file: string, key: string): string | null {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(`^${key}="([^"]+)"`, "m");
  const m = src.match(re);
  return m ? m[1] : null;
}

async function main() {
  const envFile = ".env.local";
  const POLAR_ACCESS_TOKEN = readEnvValue(envFile, "POLAR_ACCESS_TOKEN");
  const STARTER_PRODUCT_ID = readEnvValue(envFile, "NEXT_PUBLIC_STARTER_TIER");
  if (!POLAR_ACCESS_TOKEN)
    throw new Error("POLAR_ACCESS_TOKEN not found in .env.local");
  if (!STARTER_PRODUCT_ID)
    throw new Error("NEXT_PUBLIC_STARTER_TIER not found in .env.local");

  const BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://api.polar.sh/v1"
      : "https://sandbox-api.polar.sh/v1";

  // 1) List products
  const prodRes = await fetch(`${BASE_URL}/products`, {
    headers: { Authorization: `Bearer ${POLAR_ACCESS_TOKEN}` },
  });
  if (!prodRes.ok) {
    const text = await prodRes.text();
    throw new Error(
      `Failed to list products: ${prodRes.status} ${prodRes.statusText} -> ${text?.slice(0, 400)}`
    );
  }
  const productsPayload: any = await prodRes.json();
  const items: any[] = productsPayload.items || productsPayload.result || [];
  const product = items.find((i) => i?.id === STARTER_PRODUCT_ID);
  if (!product) {
    throw new Error(
      `Starter product ${STARTER_PRODUCT_ID} not found. Available product IDs: ${items
        .map((i) => i?.id)
        .filter(Boolean)
        .join(", ")}`
    );
  }

  const prices: any[] = product.prices || [];
  const chosenPrice =
    prices.find(
      (p) =>
        (p.recurring_interval === "month" || p.type === "recurring") &&
        (p.price_currency === "USD" || p.currency === "USD")
    ) || prices[0];
  if (!chosenPrice) {
    throw new Error("No prices found on starter product");
  }

  // 2) Create checkout link for the chosen price
  const createRes = await fetch(`${BASE_URL}/checkout-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_price_id: chosenPrice.id,
      allow_discount_codes: true,
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(
      `Failed to create checkout link: ${createRes.status} ${createRes.statusText} -> ${text?.slice(0, 400)}`
    );
  }
  const link = await createRes.json();
  const linkId = link.id || link.checkout_link?.id;
  const linkUrl = link.url || link.checkout_link?.url;

  // 3) Fetch link to verify
  const getRes = await fetch(`${BASE_URL}/checkout-links/${linkId}`, {
    headers: { Authorization: `Bearer ${POLAR_ACCESS_TOKEN}` },
  });
  if (!getRes.ok) {
    const text = await getRes.text();
    throw new Error(
      `Failed to fetch checkout link: ${getRes.status} ${getRes.statusText} -> ${text?.slice(0, 400)}`
    );
  }
  const linkFull = await getRes.json();

  const priceNode = linkFull?.products?.[0]?.prices?.[0] ?? {};

  const output = {
    baseUrl: BASE_URL,
    productId: product.id,
    productName: product.name,
    priceId: chosenPrice.id,
    price_amount: chosenPrice.price_amount,
    price_currency: chosenPrice.price_currency ?? chosenPrice.currency,
    linkId,
    linkUrl,
    verified: true,
    linkPreview: {
      price_amount: priceNode?.price_amount,
      price_currency: priceNode?.price_currency,
      allow_discount_codes: linkFull?.allow_discount_codes,
    },
  } as const;

  writeFileSync("polar_setup_output.json", JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("[polar_setup] Error:", err?.message || err);
  process.exit(1);
});
