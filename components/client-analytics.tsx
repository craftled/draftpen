"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type React from "react";

export function ClientAnalytics(): React.JSX.Element {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
