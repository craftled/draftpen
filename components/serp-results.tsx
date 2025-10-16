import React from 'react';

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
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function Favicon({ url, alt }: { url: string; alt: string }) {
  const host = hostFromUrl(url);
  const src = `https://www.google.com/s2/favicons?sz=16&domain=${host}`;
  return <img src={src} alt={alt} className="size-3 shrink-0 rounded-sm" />;
}

function SerpListRow({ r }: { r: SerpResult }) {
  const host = hostFromUrl(r.link);
  return (
    <div className="py-3">
      <div className="flex gap-2 text-sm">

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 shrink-0 tabular-nums">
              {r.position}
            </span>
            <a href={r.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline line-clamp-1 text-[15px] sm:text-base">
              {r.title}
            </a>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Favicon url={r.link} alt={host} />
              {host}
            </a>
            {r.date && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {r.date}
              </span>
            )}
          </div>
          {r.snippet && (
            <div className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.snippet}</div>
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
    <div className="my-2 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
        <div className="text-sm font-medium">
          SERP Results{query ? ` · ${query}` : ''}
        </div>
        <div className="text-xs text-muted-foreground">
          {results.length} results{output.credits ? ` · ${output.credits} page${output.credits > 1 ? 's' : ''}` : ''}
        </div>
      </div>

      {/* Organic Results */}
      <div className="px-3 py-2">
        {results.length === 0 ? (
          <div className="text-sm text-muted-foreground">No results.</div>
        ) : (
          <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
            {results.map((r) => (
              <SerpListRow key={`${r.position}-${r.link}`} r={r} />
            ))}
          </div>
        )}
      </div>

      {/* PAA and Related */}
      <div className="px-3 pb-3 space-y-3">
        <div>
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">People Also Ask</div>
          {paa.length === 0 ? (
            <div className="text-xs text-muted-foreground">(No People Also Ask results returned.)</div>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {paa.map((p) => (
                <li key={p.link} className="text-xs">
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {p.question}
                  </a>
                  {p.title && (
                    <span className="text-muted-foreground"> — {hostFromUrl(p.link)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Related searches</div>
          {related.length === 0 ? (
            <div className="text-xs text-muted-foreground">(No related searches returned.)</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {related.map((r) => (
                <span
                  key={r.query}
                  className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
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

