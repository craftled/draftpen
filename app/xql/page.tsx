"use client";

import { useChat } from "@ai-sdk/react";
import { CodeIcon, XLogoIcon } from "@phosphor-icons/react";
import { DefaultChatTransport } from "ai";
import { Check, Copy, Loader2, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useRef, useState } from "react";
import { Tweet } from "react-tweet";
import { toast } from "sonner";
import { highlight } from "sugar-high";
import type { XQLMessage } from "@/app/api/xql/route";
import { BorderTrail } from "@/components/core/border-trail";
import { TextShimmer } from "@/components/core/text-shimmer";
import { SciraLogo } from "@/components/logos/scira-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { XQLProUpgradeScreen } from "@/components/xql-pro-upgrade-screen";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";

export default function XQLPage() {
  const [input, setInput] = useState<string>("");
  const [copiedResult, setCopiedResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user, isProUser, isLoading: isProStatusLoading } = useUser();
  const router = useRouter();

  // Feature disabled: redirect to home
  React.useEffect(() => {
    router.replace("/");
  }, [router]);

  const { messages, sendMessage, status } = useChat<XQLMessage>({
    transport: new DefaultChatTransport({
      api: "/api/xql",
    }),
    onError: (error) => {
      toast.error("Query failed", {
        description: error.message,
      });
    },
  });

  const handleRun = useCallback(async () => {
    if (!input.trim() || status !== "ready") {
      return;
    }

    await sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: `Convert this natural language query to SQL: ${input}`,
        },
      ],
    });
  }, [input, status, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    },
    [handleRun]
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedResult(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedResult(false), 2000);
    } catch (_err) {
      toast.error("Failed to copy");
    }
  }, []);

  React.useEffect(() => {
    if (!(isProStatusLoading || user)) {
      router.push("/sign-in");
    }
  }, [user, router, isProStatusLoading]);

  const lastMessage = messages.at(-1);

  if (!(isProStatusLoading || isProUser)) {
    return <XQLProUpgradeScreen />;
  }

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden bg-background transition-[justify-content,align-items] duration-700 ease-in-out",
        messages.length === 0 ? "flex items-center justify-center" : ""
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-3xl px-4 transition-[padding] duration-700 ease-in-out",
          messages.length === 0
            ? "py-12 sm:py-14"
            : "pt-12 pb-12 sm:pt-14 sm:pb-10"
        )}
      >
        <div className="-tracking-normal mb-6 flex items-center justify-center gap-2 font-be-vietnam-pro font-medium text-2xl sm:mb-8 sm:gap-3 sm:text-3xl md:text-5xl">
          <span className="text-foreground">Scira</span>
          <div className="relative flex items-center">
            <XLogoIcon className="-mr-1 sm:-mr-2 size-6 font-medium text-foreground sm:size-8 md:size-12" />
            <h1 className="text-foreground">QL</h1>
            <div className="-top-1 -right-1 sm:-top-2 sm:-right-2 md:-top-3 md:-right-4 absolute">
              <div className="rounded-sm bg-primary px-1 pt-0.5 pb-0.5 font-semibold text-[8px] text-primary-foreground sm:px-1.5 sm:pb-0.75 sm:text-xs">
                β
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-2 sm:px-4">
          <XLogoIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
          <div className="!m-0 !p-0 relative min-w-0 flex-1">
            <Input
              className="!bg-transparent w-full border-0 p-0 pr-12 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-0 sm:pr-14 sm:text-base"
              disabled={isProStatusLoading || status !== "ready"}
              maxLength={200}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask in natural language…"
              ref={inputRef}
              value={input}
            />
            {input.trim() && (
              <Button
                className="-translate-y-1/2 !p-0 !m-0 absolute top-1/2 right-0 size-8 rounded-full sm:size-9"
                onClick={() => setInput("")}
                size="sm"
                variant="secondary"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {input.trim() && (
            <div className="h-8 w-px flex-shrink-0 self-center rounded bg-border sm:h-9" />
          )}
          <Button
            className="h-8 rounded-full px-3 font-semibold text-xs sm:h-9 sm:px-4 sm:text-sm"
            disabled={!input.trim() || status !== "ready" || isProStatusLoading}
            onClick={handleRun}
            size="sm"
          >
            {status === "streaming" || status === "submitted" ? (
              <Loader2 className="h-3 w-3 animate-spin sm:h-4 sm:w-4" />
            ) : (
              <Play className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </Button>
        </div>

        {isProStatusLoading && (
          <div className="mt-8 space-y-4">
            <div className="space-y-2 text-center">
              <div className="mx-auto h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-3 w-64 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {[...new Array(6)].map((_, i) => (
                <Card className="animate-pulse p-0 shadow-none" key={i}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-4 w-4 rounded bg-muted sm:h-5 sm:w-5" />
                      <div className="ml-auto h-3 w-3 rounded bg-muted" />
                    </div>
                    <div className="mb-1 h-4 w-full rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted/60" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {messages.length === 0 && status === "ready" && !isProStatusLoading && (
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <p className="mb-2 text-muted-foreground text-sm">
                Try these XQL queries:
              </p>
              <p className="text-muted-foreground/70 text-xs">
                Search X posts with natural language
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {[
                {
                  query: "Scira AI tweets from last week",
                  description: "Popular content with date range",
                },
                {
                  query: "Posts from @elonmusk about Tesla",
                  description: "Specific user + topic filter",
                },
                {
                  query: "Research Paper discussions with 1000+ views today",
                  description: "High engagement + recent",
                },
                {
                  query: "Hugging Face tweets about new AI models",
                  description: "Topic with handle exclusion",
                },
                {
                  query: "Posts from @openai @anthropicai with 500+ likes",
                  description: "Multiple handles + engagement",
                },
                {
                  query: "Tech news from past 3 days with 2000+ views",
                  description: "Date range + view threshold",
                },
              ].map((example, i) => (
                <Card
                  className="group cursor-pointer p-0 shadow-none transition-colors hover:border-primary/30"
                  key={i}
                  onClick={() => setInput(example.query)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex-shrink-0 rounded bg-secondary p-1">
                        <XLogoIcon className="h-3 w-3 text-foreground" />
                      </div>
                      <div className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                    <p className="mb-1 font-medium text-foreground text-sm leading-tight">
                      {example.query}
                    </p>
                    <p className="text-muted-foreground text-xs leading-tight">
                      {example.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-muted/30 bg-accent p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <CodeIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <div className="text-muted-foreground text-xs sm:text-sm">
                  <p className="mb-1 font-medium sm:mb-2">
                    XQL supports advanced filtering:
                  </p>
                  <ul className="space-y-0.5 text-xs sm:space-y-1 sm:text-sm">
                    <li>
                      • Date ranges (ISO format: YYYY-MM-DD or natural language)
                    </li>
                    <li>
                      • User handles (include up to 10 or exclude up to 10, not
                      both)
                    </li>
                    <li>
                      • Engagement thresholds (minimum likes/views required)
                    </li>
                    <li>• Topic and keyword combinations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="fade-in-0 slide-in-from-bottom-4 mt-8 animate-in space-y-4 duration-700">
            {lastMessage && (() => null)()}

            {lastMessage?.parts.map((part, index) => {
              if (
                part.type === "tool-xql" &&
                "input" in part &&
                (part.state === "input-streaming" ||
                  part.state === "input-available" ||
                  part.state === "output-available" ||
                  part.state === "output-error")
              ) {
                const input = part.input;

                if (!input || typeof input !== "object") {
                  return null;
                }

                // Build SQL-like statement
                const buildSQLQuery = () => {
                  let sql = "SELECT * FROM x_posts\n";

                  const conditions = [] as string[];

                  if (input?.query) {
                    conditions.push(`  content LIKE '%${input.query}%'`);
                  }

                  // Ensure dates are always shown (default: last 30 days to today)
                  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
                  const today = new Date();
                  const thirtyDaysAgo = new Date(
                    Date.now() - 15 * 24 * 60 * 60 * 1000
                  );
                  const startDate =
                    input?.startDate &&
                    String(input.startDate).trim().length > 0
                      ? input.startDate
                      : toYMD(thirtyDaysAgo);
                  const endDate =
                    input?.endDate && String(input.endDate).trim().length > 0
                      ? input.endDate
                      : toYMD(today);

                  conditions.push(`  created_at >= '${startDate}'`);
                  conditions.push(`  created_at <= '${endDate}'`);

                  if (
                    input?.includeXHandles &&
                    Array.isArray(input.includeXHandles) &&
                    input.includeXHandles.length > 0
                  ) {
                    const handles = input.includeXHandles
                      .map((h) => `'${h ?? ""}'`)
                      .join(", ");
                    conditions.push(`  author_handle IN (${handles})`);
                  }

                  if (
                    input?.excludeXHandles &&
                    Array.isArray(input.excludeXHandles) &&
                    input.excludeXHandles.length > 0
                  ) {
                    const handles = input.excludeXHandles
                      .map((h) => `'${h ?? ""}'`)
                      .join(", ");
                    conditions.push(`  author_handle NOT IN (${handles})`);
                  }

                  if (input?.postFavoritesCount) {
                    conditions.push(
                      `  favorites_count >= ${input.postFavoritesCount}`
                    );
                  }

                  if (input?.postViewCount) {
                    conditions.push(`  view_count >= ${input.postViewCount}`);
                  }

                  if (conditions.length > 0) {
                    sql += `WHERE\n${conditions.join(" AND\n")}`;
                  }

                  sql += "\nORDER BY created_at DESC";

                  if (input?.maxResults) {
                    sql += `\nLIMIT ${input.maxResults}`;
                  }

                  return sql;
                };

                return (
                  <Card className="bg-muted/20 p-0 shadow-none" key={index}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 grow">
                          <div className="mb-3 flex items-center gap-2 sm:gap-3">
                            <CodeIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                            <p className="font-medium text-muted-foreground text-sm">
                              XQL Code
                            </p>
                          </div>
                          <div className="relative">
                            <pre className="w-full max-w-full overflow-x-auto rounded-lg border bg-muted/30 p-2 font-mono text-xs leading-relaxed sm:p-3 sm:text-sm">
                              <code
                                dangerouslySetInnerHTML={{
                                  __html: highlight(buildSQLQuery()),
                                }}
                              />
                            </pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })}

            {/* Show loading state */}
            {(status === "streaming" || status === "submitted") && (
              <Card className="relative my-4 h-[80px] w-full overflow-hidden p-0 shadow-none sm:h-[100px]">
                <BorderTrail
                  className={cn(
                    "bg-gradient-to-r from-primary/20 via-primary to-primary/20"
                  )}
                  size={80}
                />
                <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
                  <div className="relative flex items-center gap-2 sm:gap-3">
                    <div
                      className={cn(
                        "relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10"
                      )}
                    >
                      <BorderTrail
                        className={cn(
                          "bg-gradient-to-r from-primary/20 via-primary to-primary/20"
                        )}
                        size={40}
                      />
                      {lastMessage?.parts.some(
                        (part) =>
                          part.type === "tool-xql" &&
                          (part.state === "input-streaming" ||
                            part.state === "input-available")
                      ) ? (
                        <CodeIcon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                      ) : (
                        <XLogoIcon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 sm:space-y-2">
                      <TextShimmer
                        className="font-medium text-sm sm:text-base"
                        duration={2}
                      >
                        {lastMessage?.parts.some(
                          (part) =>
                            part.type === "tool-xql" &&
                            (part.state === "input-streaming" ||
                              part.state === "input-available")
                        )
                          ? "Executing XQL..."
                          : "Writing XQL code..."}
                      </TextShimmer>
                      <div className="flex gap-1 sm:gap-2">
                        {[...new Array(3)].map((_, i) => (
                          <div
                            className="h-1 animate-pulse rounded-full bg-muted sm:h-1.5"
                            key={i}
                            style={{
                              width: `${Math.random() * 30 + 15}px`,
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show the citations */}
            {lastMessage?.parts.map((part, index) => {
              if (
                part.type === "tool-xql" &&
                part.state === "output-available"
              ) {
                const citations =
                  "output" in part && Array.isArray(part.output)
                    ? part.output
                    : [];
                return (
                  <Card className="p-0 shadow-none" key={index}>
                    <CardContent className="p-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <SciraLogo className="size-6 flex-shrink-0 text-foreground" />
                          <span className="font-semibold text-foreground text-sm sm:text-base">
                            Scira found {citations.length} Posts
                          </span>
                        </div>

                        {citations.length > 0 && (
                          <Button
                            className="h-8 w-8 flex-shrink-0 rounded-full p-0 sm:h-9 sm:w-9"
                            onClick={() =>
                              copyToClipboard(citations.join("\n"))
                            }
                            size="sm"
                            variant="ghost"
                          >
                            {copiedResult ? (
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                            ) : (
                              <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                        {citations.length > 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            {citations.map((url: string | null, i: number) => {
                              if (!url) {
                                return null;
                              }
                              // Extract tweet ID from URL
                              const tweetIdMatch =
                                url?.match(/\/status\/(\d+)/);
                              const tweetId = tweetIdMatch
                                ? tweetIdMatch[1]
                                : null;

                              if (tweetId) {
                                return (
                                  <div
                                    className="tweet-wrapper-sheet w-full max-w-lg sm:max-w-xl"
                                    key={i}
                                  >
                                    <Tweet id={tweetId} />
                                  </div>
                                );
                              }

                              // Fallback for URLs that don't match tweet pattern
                              return (
                                <a
                                  className="group flex w-full max-w-lg items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/30 sm:max-w-xl sm:p-4"
                                  href={url}
                                  key={i}
                                  target="_blank"
                                >
                                  <XLogoIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-foreground text-sm group-hover:text-primary">
                                      {url
                                        .replace("https://x.com/", "")
                                        .replace("https://twitter.com/", "")}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      {url.startsWith("https://x.com")
                                        ? "x.com"
                                        : "twitter.com"}
                                    </p>
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-muted-foreground sm:py-8">
                            <XLogoIcon className="mx-auto mb-2 h-10 w-10 opacity-50 sm:mb-3 sm:h-12 sm:w-12" />
                            <p className="text-sm sm:text-base">
                              No X citations found for this query
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })}

            {/* Show errors */}
            {lastMessage?.parts.map((part, index) => {
              if (part.type === "tool-xql" && part.state === "output-error") {
                return (
                  <Card className="border-destructive shadow-none" key={index}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2 text-destructive sm:gap-3">
                        <XLogoIcon className="mt-0.5 h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">
                            Search Error
                          </p>
                          <p className="text-xs leading-relaxed sm:text-sm">
                            {"errorText" in part
                              ? part.errorText
                              : "Unknown error occurred"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
