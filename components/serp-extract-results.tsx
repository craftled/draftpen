"use client";

type SerpExtractOutput = {
  extractionId: string;
  summary: {
    totalPages: number;
    successCount: number;
    failedUrls: string[];
    source: "exa" | "firecrawl" | "mixed";
  };
};

export default function SerpExtractResults({
  output,
}: {
  output: SerpExtractOutput;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="font-semibold text-green-900 dark:text-green-100">
          Extraction Complete
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
          Extracted {output.summary.totalPages} pages
        </p>
        <p className="text-xs font-mono mt-2 text-green-600 dark:text-green-400">
          Extraction ID: {output.extractionId}
        </p>
      </div>

      {output.summary.failedUrls.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
            Failed URLs ({output.summary.failedUrls.length}):
          </h4>
          <ul className="text-xs mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
            {output.summary.failedUrls.map((url: string) => (
              <li key={url} className="truncate">
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
