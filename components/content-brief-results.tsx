"use client";

import { useState } from "react";
import Marked from "marked-react";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div>
          <h3 className="text-lg font-semibold">Content Brief</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Target Keyword: <span className="font-medium">{output.targetKeyword}</span>
            {output.monthlySearches && (
              <> • Monthly Searches: {output.monthlySearches.toLocaleString()}</>
            )}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          type="button"
        >
          {copied ? "Copied!" : "Copy Brief"}
        </button>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <Marked
          value={output.brief}
          gfm
          breaks
          renderer={{
            link({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {children}
                </a>
              );
            },
          }}
        />
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
        <h4 className="mb-2 text-sm font-semibold">Quick Stats</h4>
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

