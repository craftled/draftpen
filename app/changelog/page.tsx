import type { Metadata } from "next";
import Link from "next/link";

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";

type ChangelogEntry = {
  id: string;
  date: string;
  dateTime: string;
  title: string;
  summary: string;
  tag: string;
  highlights: string[];
};

const entries = [
  {
    id: "precision-drafting",
    date: "Feb 21, 2025",
    dateTime: "2025-02-21",
    title: "Precision drafting, keyboard-first",
    summary:
      "A lean editing lane for people who live in the keyboard. Inline actions stay in reach and the canvas feels as responsive as a native doc.",
    tag: "Feature",
    highlights: [
      "Command palette for block actions so you can split, wrap, or regenerate without touching the mouse",
      "Word count, readability hints, and save state now stay pinned as you move through the draft",
      "Autosave is instant and version history now groups small edits to keep the stream tidy",
    ],
  },
  {
    id: "research-capture",
    date: "Feb 12, 2025",
    dateTime: "2025-02-12",
    title: "Research capture that stays organized",
    summary:
      "Drop sources and move on. Draftpen now pulls structure from links, keeps citations attached, and leaves more room for writing.",
    tag: "Improvement",
    highlights: [
      "Dropping a URL auto-extracts key points into a clean side rail ready to cite",
      "Copying text carries source labels and links so context stays intact outside Draftpen",
      "Source cards have tighter spacing, clearer hierarchy, and consistent link styles",
    ],
  },
  {
    id: "template-gallery",
    date: "Jan 28, 2025",
    dateTime: "2025-01-28",
    title: "Templates, but lighter",
    summary:
      "A minimal gallery focused on speed: start from proven structures, save your own, and keep teams aligned on tone and format.",
    tag: "Feature",
    highlights: [
      "Template gallery opens faster with live previews and a keyboard-friendly filter",
      "Custom templates accept tone and audience placeholders so prompts stay reusable",
      "Saved templates sync across your workspace to keep drafts consistent",
    ],
  },
  {
    id: "quality-of-life",
    date: "Jan 10, 2025",
    dateTime: "2025-01-10",
    title: "Quality-of-life polish",
    summary:
      "Small touches that make daily writing calmer. Loading feels lighter, editing stays anchored, and empty states are actually useful.",
    tag: "Polish",
    highlights: [
      "Cold-start latency for AI replies is down, making the first response noticeably snappier",
      "Floating toolbar now stays visible on long documents without covering your text",
      "Empty states include inline shortcuts and examples so new files start with momentum",
    ],
  },
] satisfies ChangelogEntry[];

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Linear-inspired, minimal changelog for Draftpen - follow along with the latest improvements.",
};

export default function ChangelogPage() {
  const [latest] = entries;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-gradient-to-b from-muted/40 via-background to-background">
        <div className="container mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full bg-primary"
            />
            <span>Changelog</span>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Building Draftpen in the open.
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Simple, linear-style updates on how we are making Draftpen faster,
            calmer, and more predictable for everyday writing and research.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full bg-emerald-500"
              />
              <span>Latest update {latest.date}</span>
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium text-foreground transition hover:-translate-y-[1px] hover:bg-card/80"
              href="/"
            >
              Back to Draftpen
            </Link>
          </div>
        </div>
      </section>

      <main className="px-4 py-12 sm:py-16">
        <div className="container mx-auto max-w-5xl">
          <div className="relative">
            <div
              aria-hidden
              className="absolute left-5 top-4 hidden h-[calc(100%-2rem)] w-px bg-border sm:block"
            />
            <div className="space-y-8 sm:space-y-10">
              {entries.map((entry) => (
                <article
                  className="relative grid gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[160px_1fr]"
                  key={entry.id}
                >
                  <div className="flex items-start gap-3 text-sm text-muted-foreground sm:flex-col sm:items-start sm:gap-2">
                    <div className="relative mt-1 flex h-6 w-6 items-center justify-center">
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-background"
                      />
                      <span
                        aria-hidden
                        className="h-3 w-3 rounded-full border border-primary bg-primary/10 ring-4 ring-background"
                      />
                    </div>
                    <span className="rounded-full border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                      {entry.tag}
                    </span>
                    <time
                      className="font-medium text-foreground"
                      dateTime={entry.dateTime}
                    >
                      {entry.date}
                    </time>
                  </div>

                  <div className="space-y-4">
                    <CardHeader className="px-0 pb-0">
                      <CardTitle className="text-2xl font-semibold">
                        {entry.title}
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {entry.summary}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="px-0">
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {entry.highlights.map((highlight) => (
                          <li
                            className="flex gap-3 rounded-xl border bg-background/70 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
                            key={`${entry.id}-${highlight}`}
                          >
                            <span
                              aria-hidden
                              className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary"
                            />
                            <span className="text-foreground">
                              {highlight}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
