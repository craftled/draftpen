"use client";

import Marked from "marked-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";

type ContentBriefOutput = {
  targetKeyword: string;
  monthlySearches?: number;
  brief: string;
  analysis: {
    avgWordCount: number;
    avgIntroWordCount: number;
    topPageFleschScore: number;
    topKeywords: Array<{ keyword: string; frequency: number }>;
    contentStructure: Array<{ level: 2 | 3; title: string }>;
  };
  competitors: Array<{ url: string; title: string }>;
};

type ContentBriefResultsProps = {
  output: ContentBriefOutput;
};

export default function ContentBriefResults({
  output,
}: ContentBriefResultsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output.brief);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (_error) {
      // Fallback for older browsers
    }
  };

  // Generate stable keys for markdown elements
  const getElementKey = useMemo(() => {
    const contentHash = output.brief.slice(0, 50).replace(/[^a-zA-Z0-9]/g, "");
    const counters = {
      list: 0,
      listItem: 0,
      paragraph: 0,
      heading: 0,
    };

    return (type: keyof typeof counters, index?: number) => {
      const count = counters[type]++;
      return `${contentHash}-${type}-${index ?? count}`;
    };
  }, [output.brief]);

  const renderer = useMemo(
    () => ({
      link(href: string, text: React.ReactNode) {
        return (
          <a
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            href={href}
            key={`link-${href}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {text}
          </a>
        );
      },
      list(children: React.ReactNode, ordered: boolean) {
        const key = getElementKey("list");
        const Tag = ordered ? "ol" : "ul";
        return (
          <Tag className={ordered ? "list-decimal" : "list-disc"} key={key}>
            {children}
          </Tag>
        );
      },
      listItem(children: React.ReactNode[]) {
        const key = getElementKey("listItem");
        return <li key={key}>{children}</li>;
      },
      paragraph(children: React.ReactNode) {
        const key = getElementKey("paragraph");
        return <p key={key}>{children}</p>;
      },
      heading(children: React.ReactNode, level: number) {
        const key = getElementKey("heading");
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;
        return <Tag key={key}>{children}</Tag>;
      },
    }),
    [getElementKey]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-neutral-200 border-b pb-3 dark:border-neutral-800">
        <div>
          <h3 className="font-semibold text-lg">Content Brief</h3>
          <p className="text-neutral-600 text-sm dark:text-neutral-400">
            Target Keyword:{" "}
            <span className="font-medium">{output.targetKeyword}</span>
            {output.monthlySearches && (
              <>
                {" "}
                • Monthly Searches: {output.monthlySearches.toLocaleString()}
              </>
            )}
          </p>
        </div>
        <button
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-medium text-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied!" : "Copy Brief"}
        </button>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <Marked breaks gfm renderer={renderer} value={output.brief} />
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
        <h4 className="mb-2 font-semibold text-sm">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-600 dark:text-neutral-400">
              Avg Word Count:
            </span>{" "}
            <span className="font-medium">{output.analysis.avgWordCount}</span>
          </div>
          <div>
            <span className="text-neutral-600 dark:text-neutral-400">
              Avg Intro Words:
            </span>{" "}
            <span className="font-medium">
              {output.analysis.avgIntroWordCount}
            </span>
          </div>
          <div>
            <span className="text-neutral-600 dark:text-neutral-400">
              Flesch Score:
            </span>{" "}
            <span className="font-medium">
              {output.analysis.topPageFleschScore.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-neutral-600 dark:text-neutral-400">
              Competitors Analyzed:
            </span>{" "}
            <span className="font-medium">{output.competitors.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
