import {
  DEFAULT_FAVICON_FALLBACK,
  InlineFavicon,
} from "@/components/ui/inline-favicon";

interface SerpResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position: number;
  sitelinks?: Array<{ title: string; link: string }>; // optional, unused for compact view
}

interface PeopleAlsoAskItem {
  question: string;
  snippet?: string;
  title?: string;
  link: string;
}

interface RelatedSearchItem {
  query: string;
}

interface SerperOutput {
  provider: string;
  endpoint: string;
  input?: { query?: string; num?: number; country?: string; language?: string };
  organic: { count: number; results: SerpResult[] };
  peopleAlsoAsk?: { count: number; questions: PeopleAlsoAskItem[] };
  relatedSearches?: { count: number; queries: RelatedSearchItem[] };
  credits?: number;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Favicon({ url, alt }: { url: string; alt: string }) {
  const host = hostFromUrl(url);
  const src = `https://www.google.com/s2/favicons?sz=16&domain=${host}`;
  return (
    <InlineFavicon
      alt={`${alt} favicon`}
      className="size-3 shrink-0 rounded-sm"
      fallbackSrc={DEFAULT_FAVICON_FALLBACK}
      size={16}
      src={src}
    />
  );
}

function SerpListRow({ r }: { r: SerpResult }) {
  const host = hostFromUrl(r.link);
  return (
    <div className="py-3">
      <div className="flex gap-2 text-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-200/60 bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs tabular-nums dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-300">
              {r.position}
            </span>
            <a
              className="line-clamp-1 font-medium text-[15px] hover:underline sm:text-base"
              href={r.link}
              rel="noopener noreferrer"
              target="_blank"
            >
              {r.title}
            </a>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <a
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              href={r.link}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Favicon alt={host} url={r.link} />
              {host}
            </a>
            {r.date && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs dark:bg-neutral-800 dark:text-neutral-300">
                {r.date}
              </span>
            )}
          </div>
          {r.snippet && (
            <div className="mt-2 line-clamp-2 text-muted-foreground text-sm">
              {r.snippet}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SerpResults({ output }: { output: SerperOutput }) {
  const results = output?.organic?.results ?? [];
  const paa = output?.peopleAlsoAsk?.questions ?? [];
  const related = output?.relatedSearches?.queries ?? [];
  const query = output?.input?.query;

  return (
    <div className="my-2 rounded-md border border-neutral-200/60 bg-white/50 backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-neutral-200/60 border-b px-3 py-2 dark:border-neutral-800/60">
        <div className="font-medium text-sm">
          SERP Results{query ? ` · ${query}` : ""}
        </div>
        <div className="text-muted-foreground text-xs">
          {results.length} results
          {output.credits
            ? ` · ${output.credits} page${output.credits > 1 ? "s" : ""}`
            : ""}
        </div>
      </div>

      {/* Organic Results */}
      <div className="px-3 py-2">
        {results.length === 0 ? (
          <div className="text-muted-foreground text-sm">No results.</div>
        ) : (
          <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
            {results.map((r) => (
              <SerpListRow key={`${r.position}-${r.link}`} r={r} />
            ))}
          </div>
        )}
      </div>

      {/* PAA and Related */}
      <div className="space-y-3 px-3 pb-3">
        <div>
          <div className="mb-1.5 font-semibold text-neutral-700 text-sm dark:text-neutral-300">
            People Also Ask
          </div>
          {paa.length === 0 ? (
            <div className="text-muted-foreground text-xs">
              (No People Also Ask results returned.)
            </div>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {paa.map((p) => (
                <li className="text-xs" key={p.link}>
                  <a
                    className="hover:underline"
                    href={p.link}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {p.question}
                  </a>
                  {p.title && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {hostFromUrl(p.link)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1.5 font-semibold text-neutral-700 text-sm dark:text-neutral-300">
            Related searches
          </div>
          {related.length === 0 ? (
            <div className="text-muted-foreground text-xs">
              (No related searches returned.)
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {related.map((r) => (
                <span
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs dark:bg-neutral-800 dark:text-neutral-300"
                  key={r.query}
                >
                  {r.query}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
