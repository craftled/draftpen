"use client";

import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

// Since this is client-side code, window.location.origin will always be available
// when this module is actually executed (not during SSR)
// Better Auth allows baseURL to be optional if client and server share the same domain
const baseURL =
  typeof window !== "undefined" ? window.location.origin : undefined;

export const betterauthClient = createAuthClient({
  baseURL,
  plugins: [],
});

export const authClient = createAuthClient({
  baseURL,
  plugins: [polarClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
