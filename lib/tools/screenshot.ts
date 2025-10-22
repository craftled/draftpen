import { put } from "@vercel/blob";
import { tool } from "ai";
import { Buffer } from "node:buffer";
import { createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
import { serverEnv } from "@/env/server";

const SCREENSHOT_ENDPOINT = "https://api.screenshotone.com/take";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB safety cap
const REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 720;

const WAIT_UNTIL_MAP = {
  load: "load",
  domcontentloaded: "domcontentloaded",
  networkidle0: "networkidle0",
  networkidle2: "networkidle2",
} as const;

const isPrivateHostname = (hostname: string): boolean => {
  const lowered = hostname.toLowerCase();

  if (
    lowered === "localhost" ||
    lowered === "127.0.0.1" ||
    lowered === "::1" ||
    lowered === "0.0.0.0"
  ) {
    return true;
  }

  // Basic checks for RFC1918 address blocks
  if (
    lowered.startsWith("10.") ||
    lowered.startsWith("192.168.") ||
    lowered.startsWith("172.") // 172.16.0.0 – 172.31.255.255
  ) {
    return true;
  }

  return false;
};

const buildSignedUrl = (
  params: URLSearchParams,
  secretKey: string | undefined
): string => {
  if (!secretKey) {
    return `${SCREENSHOT_ENDPOINT}?${params.toString()}`;
  }

  const entries = Array.from(params.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const canonicalQuery = entries
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const signature = createHmac("sha256", secretKey)
    .update(canonicalQuery)
    .digest("hex");

  const signedParams = new URLSearchParams(entries);
  signedParams.set("token", signature);

  return `${SCREENSHOT_ENDPOINT}?${signedParams.toString()}`;
};

const fetchScreenshot = async (url: string): Promise<ArrayBuffer> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/png,image/jpeg,image/webp",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => `Status ${response.status}`);
      throw new Error(
        `ScreenshotOne responded with ${response.status}: ${errorBody}`
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error("ScreenshotOne returned an empty image buffer");
    }
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(
        `Screenshot exceeds size limit (${(
          buffer.byteLength /
          (1024 * 1024)
        ).toFixed(1)}MB)`
      );
    }

    return buffer;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
};

const toDataUrl = (buffer: ArrayBuffer, format: string): string => {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/${format};base64,${base64}`;
};

export const screenshotTool = tool({
  description:
    "Capture a fresh screenshot of a public webpage using ScreenshotOne and return a shareable image.",
  inputSchema: z.object({
    url: z.string().url().max(2048).describe("Target webpage URL to capture"),
    fullPage: z
      .boolean()
      .optional()
      .describe("Capture the entire scrollable page instead of the viewport"),
    delay: z
      .number()
      .min(0)
      .max(10)
      .optional()
      .describe("Seconds to wait before capturing the screenshot"),
    selector: z
      .string()
      .trim()
      .min(1)
      .max(400)
      .optional()
      .describe("Optional CSS selector to capture a specific element"),
    deviceScaleFactor: z
      .number()
      .min(1)
      .max(3)
      .optional()
      .describe("Device scale factor (1-3)"),
    darkMode: z
      .boolean()
      .optional()
      .describe("Render the page in dark mode before capturing"),
    waitUntil: z
      .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
      .optional()
      .describe("Event to wait for before capturing"),
    viewportWidth: z
      .number()
      .int()
      .min(320)
      .max(2400)
      .optional()
      .describe("Viewport width in pixels"),
    viewportHeight: z
      .number()
      .int()
      .min(320)
      .max(2400)
      .optional()
      .describe("Viewport height in pixels"),
    format: z
      .enum(["png", "jpeg", "webp"])
      .optional()
      .describe("Image format for the screenshot"),
    inline: z
      .boolean()
      .optional()
      .describe(
        "Return the screenshot as a data URL instead of uploading to Blob storage"
      ),
  }),
  execute: async (input) => {
    const accessKey = serverEnv.SCREENSHOTONE_ACCESS_KEY;
    const secretKey = serverEnv.SCREENSHOTONE_SECRET_KEY;

    if (!accessKey) {
      throw new Error(
        "ScreenshotOne access key is not configured. Set SCREENSHOTONE_ACCESS_KEY."
      );
    }

    const { url } = input;

    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported");
    }
    if (isPrivateHostname(parsedUrl.hostname)) {
      throw new Error("Capturing screenshots of private or local URLs is not allowed");
    }

    const params = new URLSearchParams();
    params.set("access_key", accessKey);
    params.set("url", url);
    params.set("format", input.format ?? "png");
    params.set("block_ads", "true");
    params.set("block_cookie_banners", "true");
    params.set("omit_background", "false");
    params.set("viewport_width", String(input.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH));
    params.set(
      "viewport_height",
      String(input.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT)
    );

    params.set("full_page", input.fullPage === false ? "false" : "true");

    if (typeof input.delay === "number") {
      params.set("delay", input.delay.toString());
    }

    if (input.selector) {
      params.set("selector", input.selector);
    }

    if (typeof input.deviceScaleFactor === "number") {
      params.set("device_scale_factor", input.deviceScaleFactor.toString());
    }

    if (input.darkMode) {
      params.set("dark_mode", "true");
    }

    if (input.waitUntil) {
      params.set("wait_for_event", WAIT_UNTIL_MAP[input.waitUntil]);
    }

    const requestUrl = buildSignedUrl(params, secretKey);
    let screenshotBuffer: ArrayBuffer;

    try {
      screenshotBuffer = await fetchScreenshot(requestUrl);
    } catch (error) {
      if (secretKey) {
        // Retry without signature in case configuration mismatch
        const unsignedUrl = buildSignedUrl(params, undefined);
        screenshotBuffer = await fetchScreenshot(unsignedUrl);
      } else {
        throw error instanceof Error
          ? error
          : new Error("Failed to capture screenshot");
      }
    }

    const format = input.format ?? "png";
    const bytes = screenshotBuffer.byteLength;

    if (input.inline) {
      const dataUrl = toDataUrl(screenshotBuffer, format);
      return {
        success: true,
        screenshotUrl: dataUrl,
        kind: "inline",
        sourceUrl: url,
        capturedAt: new Date().toISOString(),
        format,
        bytes,
        markdown: `![Screenshot of ${parsedUrl.hostname}](${dataUrl})`,
        options: {
          fullPage: Boolean(input.fullPage),
          delay: input.delay ?? 0,
          selector: input.selector ?? null,
          deviceScaleFactor: input.deviceScaleFactor ?? null,
          darkMode: Boolean(input.darkMode),
          waitUntil: input.waitUntil ?? null,
        },
      };
    }

    const extension = format === "jpeg" ? "jpg" : format;
    const key = `screenshots/${randomUUID()}.${extension}`;
    const { url: publicUrl } = await put(key, Buffer.from(screenshotBuffer), {
      access: "public",
      contentType: `image/${format}`,
    });

    return {
      success: true,
      screenshotUrl: publicUrl,
      kind: "blob",
      sourceUrl: url,
      capturedAt: new Date().toISOString(),
      format,
      bytes,
      markdown: `![Screenshot of ${parsedUrl.hostname}](${publicUrl})`,
      options: {
        fullPage: Boolean(input.fullPage),
        delay: input.delay ?? 0,
        selector: input.selector ?? null,
        deviceScaleFactor: input.deviceScaleFactor ?? null,
        darkMode: Boolean(input.darkMode),
        waitUntil: input.waitUntil ?? null,
      },
    };
  },
});
