import "katex/dist/katex.min.css";

import { ArrowLeftRight, Check, Copy, Download, WrapText } from "lucide-react";
import Marked, { type ReactRenderer } from "marked-react";
import { Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Latex from "react-latex-next";
import { toast } from "sonner";
import { highlight } from "sugar-high";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MarkdownRendererProps = {
  content: string;
  isUserMessage?: boolean;
};

type CitationLink = {
  text: string;
  link: string;
};

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  preload: true,
  display: "swap",
});

const _isValidUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const _isVercelBlobUrl = (str: string) => {
  try {
    const u = new URL(str);
    return u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
};

type CodeBlockProps = {
  language: string | undefined;
  children: string;
  elementKey: string;
};

// Lazy-loaded CodeBlock component for large blocks
const LazyCodeBlockComponent: React.FC<CodeBlockProps> = ({
  children,
  language,
  elementKey,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const lineCount = useMemo(() => children.split("\n").length, [children]);

  // Synchronous highlighting for better performance
  const highlightedCode = useMemo(() => {
    try {
      return children.length < 10_000 ? highlight(children) : children;
    } catch (_error) {
      return children;
    }
  }, [children]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Code copied to clipboard");
    } catch (_error) {
      toast.error("Failed to copy code");
    }
  }, [children]);

  const toggleWrap = useCallback(() => {
    setIsWrapped((prev) => {
      const newState = !prev;
      toast.success(newState ? "Code wrap enabled" : "Code wrap disabled");
      return newState;
    });
  }, []);

  return (
    <div className="group relative my-5 overflow-hidden rounded-md border border-border bg-accent">
      <div className="flex items-center justify-between border-border border-b bg-accent px-4 py-2">
        <div className="flex items-center gap-2">
          {language && (
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {language}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {lineCount} lines
          </span>
        </div>

        <div className="flex gap-1">
          <button
            className={cn(
              "rounded border border-border bg-background p-1 shadow-sm transition-colors",
              isWrapped
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={toggleWrap}
            title={isWrapped ? "Disable wrap" : "Enable wrap"}
          >
            {isWrapped ? <ArrowLeftRight size={12} /> : <WrapText size={12} />}
          </button>
          <button
            className={cn(
              "rounded border border-border bg-background p-1 shadow-sm transition-colors",
              isCopied
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleCopy}
            title={isCopied ? "Copied!" : "Copy code"}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className={cn(
            "p-2 font-mono text-sm leading-relaxed",
            isWrapped && "whitespace-pre-wrap break-words",
            !isWrapped && "overflow-x-auto whitespace-pre"
          )}
          dangerouslySetInnerHTML={{
            __html: highlightedCode,
          }}
          style={{
            fontFamily: geistMono.style.fontFamily,
          }}
        />
      </div>
    </div>
  );
};

const LazyCodeBlock = lazy(() =>
  Promise.resolve({ default: LazyCodeBlockComponent })
);

// Synchronous CodeBlock component for smaller blocks
const SyncCodeBlock: React.FC<CodeBlockProps> = ({
  language,
  children,
  elementKey,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const lineCount = useMemo(() => children.split("\n").length, [children]);

  const highlightedCode = useMemo(() => {
    try {
      return highlight(children);
    } catch (_error) {
      return children;
    }
  }, [children]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Code copied to clipboard");
    } catch (_error) {
      toast.error("Failed to copy code");
    }
  }, [children]);

  const toggleWrap = useCallback(() => {
    setIsWrapped((prev) => {
      const newState = !prev;
      toast.success(newState ? "Code wrap enabled" : "Code wrap disabled");
      return newState;
    });
  }, []);

  return (
    <div className="group relative my-5 overflow-hidden rounded-md border border-border bg-accent">
      <div className="flex items-center justify-between border-border border-b bg-accent px-4 py-2">
        <div className="flex items-center gap-2">
          {language && (
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {language}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {lineCount} lines
          </span>
        </div>

        <div className="flex gap-1">
          <button
            className={cn(
              "rounded border border-border bg-background p-1 shadow-sm transition-colors",
              isWrapped
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={toggleWrap}
            title={isWrapped ? "Disable wrap" : "Enable wrap"}
          >
            {isWrapped ? <ArrowLeftRight size={12} /> : <WrapText size={12} />}
          </button>
          <button
            className={cn(
              "rounded border border-border bg-background p-1 shadow-sm transition-colors",
              isCopied
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleCopy}
            title={isCopied ? "Copied!" : "Copy code"}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className={cn(
            "p-2 font-mono text-sm leading-relaxed",
            isWrapped && "whitespace-pre-wrap break-words",
            !isWrapped && "overflow-x-auto whitespace-pre"
          )}
          dangerouslySetInnerHTML={{
            __html: highlightedCode,
          }}
          style={{
            fontFamily: geistMono.style.fontFamily,
          }}
        />
      </div>
    </div>
  );
};

const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, children, elementKey }) => {
    // Use lazy loading for large code blocks
    if (children.length > 5000) {
      return (
        <Suspense
          fallback={
            <div className="group relative my-5 overflow-hidden rounded-md border border-border bg-accent">
              <div className="flex items-center justify-between border-border border-b bg-accent px-4 py-2">
                <div className="flex items-center gap-2">
                  {language && (
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {language}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {children.split("\n").length} lines
                  </span>
                </div>
              </div>
              <div className="p-2 font-mono text-muted-foreground text-sm leading-relaxed">
                <div className="animate-pulse">Loading code block...</div>
              </div>
            </div>
          }
        >
          <LazyCodeBlock elementKey={elementKey} language={language}>
            {children}
          </LazyCodeBlock>
        </Suspense>
      );
    }

    // Use synchronous rendering for smaller blocks
    return (
      <SyncCodeBlock elementKey={elementKey} language={language}>
        {children}
      </SyncCodeBlock>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.language === nextProps.language &&
    prevProps.elementKey === nextProps.elementKey
);

CodeBlock.displayName = "CodeBlock";

// Optimized synchronous content processor using useMemo
const useProcessedContent = (content: string) => {
  return useMemo(() => {
    const citations: CitationLink[] = [];
    const latexBlocks: Array<{
      id: string;
      content: string;
      isBlock: boolean;
    }> = [];
    let modifiedContent = content;

    try {
      // Extract and protect code blocks
      const codeBlocks: Array<{ id: string; content: string }> = [];
      const codeBlockPatterns = [/```[\s\S]*?```/g, /`[^`\n]+`/g];

      for (const pattern of codeBlockPatterns) {
        const matches = [...modifiedContent.matchAll(pattern)];
        let lastIndex = 0;
        let newContent = "";

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const id = `CODEBLOCK${codeBlocks.length}END`;
          codeBlocks.push({ id, content: match[0] });

          newContent += modifiedContent.slice(lastIndex, match.index) + id;
          lastIndex = match.index! + match[0].length;
        }

        newContent += modifiedContent.slice(lastIndex);
        modifiedContent = newContent;
      }

      // Extract monetary amounts FIRST to protect them from LaTeX patterns
      const monetaryBlocks: Array<{ id: string; content: string }> = [];
      // Match monetary amounts with optional scale words and currency codes
      const monetaryRegex =
        /(^|[\s([>~≈<)])\$\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?(?:\s+(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:month|year|token)))?(?=$|[\s).,;!?<\]])/g;

      let monetaryProcessed = "";
      let lastMonetaryIndex = 0;
      const monetaryMatches = [...modifiedContent.matchAll(monetaryRegex)];

      for (let i = 0; i < monetaryMatches.length; i++) {
        const match = monetaryMatches[i];
        const prefix = match[1];
        const id = `MONETARY${monetaryBlocks.length}END`;
        monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });

        monetaryProcessed +=
          modifiedContent.slice(lastMonetaryIndex, match.index) + prefix + id;
        lastMonetaryIndex = match.index! + match[0].length;
      }

      monetaryProcessed += modifiedContent.slice(lastMonetaryIndex);
      modifiedContent = monetaryProcessed;

      // Extract LaTeX blocks AFTER monetary amounts are protected
      const allLatexPatterns = [
        {
          patterns: [/\\\[([\s\S]*?)\\\]/g, /\$\$([\s\S]*?)\$\$/g],
          isBlock: true,
          prefix: "LATEXBLOCK",
        },
        {
          patterns: [
            /\\\(([\s\S]*?)\\\)/g,
            // Match $ expressions containing LaTeX commands, superscripts, subscripts, or braces
            /\$[^$\n]*[\\^_{}][^$\n]*\$/g,
            // Match algebraic expressions with parentheses and variables
            /\$[^$\n]*\([^)]*[a-zA-Z][^)]*\)[^$\n]*\$/g,
            // Match absolute value notation with pipes
            /\$[^$\n]*\|[^|]*\|[^$\n]*\$/g,
            // Match $ expressions with single-letter variable followed by operator and number/variable
            /\$[a-zA-Z]\s*[=<>≤≥≠]\s*[0-9a-zA-Z][^$\n]*\$/g,
            // Match $ expressions with number followed by LaTeX-style operators
            /\$[0-9][^$\n]*[\\^_≤≥≠∈∉⊂⊃∪∩θΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ°][^$\n]*\$/g,
            // Match simple mathematical variables (single letter or Greek letters, but not plain numbers)
            /\$[a-zA-ZθΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ]+\$/g,
          ],
          isBlock: false,
          prefix: "LATEXINLINE",
        },
      ];

      for (const { patterns, isBlock, prefix } of allLatexPatterns) {
        for (const pattern of patterns) {
          const matches = [...modifiedContent.matchAll(pattern)];
          let lastIndex = 0;
          let newContent = "";

          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const id = `${prefix}${latexBlocks.length}END`;
            latexBlocks.push({ id, content: match[0], isBlock });

            newContent += modifiedContent.slice(lastIndex, match.index) + id;
            lastIndex = match.index! + match[0].length;
          }

          newContent += modifiedContent.slice(lastIndex);
          modifiedContent = newContent;
        }
      }

      // Escape unescaped pipe characters inside explicit markdown link texts to avoid table cell splits
      // Example: [A | B](url) -> [A \| B](url)
      try {
        const explicitLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const linkMatches = [...modifiedContent.matchAll(explicitLinkPattern)];
        if (linkMatches.length > 0) {
          let rebuilt = "";
          let lastPos = 0;
          for (let i = 0; i < linkMatches.length; i++) {
            const m = linkMatches[i];
            const full = m[0];
            const textPart = m[1];
            const urlPart = m[2];
            // Replace only unescaped '|'
            const fixedText = textPart.replace(/(^|[^\\])\|/g, "$1\\|");
            rebuilt +=
              modifiedContent.slice(lastPos, m.index!) +
              `[${fixedText}](${urlPart})`;
            lastPos = m.index! + full.length;
          }
          rebuilt += modifiedContent.slice(lastPos);
          modifiedContent = rebuilt;
        }
      } catch {}

      // Process citations (simplified for performance)
      const refWithUrlRegex =
        /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

      let citationProcessed = "";
      let lastCitationIndex = 0;
      const citationMatches = [...modifiedContent.matchAll(refWithUrlRegex)];

      for (let i = 0; i < citationMatches.length; i++) {
        const match = citationMatches[i];
        const [fullMatch, docType, bracketText, plainText, url] = match;
        const text = bracketText || plainText;
        const fullText = (docType ? `[${docType}] ` : "") + text;
        const cleanUrl = url.replace(/[.,;:]+$/, "");
        citations.push({ text: fullText.trim(), link: cleanUrl });

        citationProcessed +=
          modifiedContent.slice(lastCitationIndex, match.index) +
          `[${fullText.trim()}](${cleanUrl})`;
        lastCitationIndex = match.index! + fullMatch.length;
      }

      citationProcessed += modifiedContent.slice(lastCitationIndex);
      modifiedContent = citationProcessed;

      // Restore protected blocks in the main content and in collected citation texts
      monetaryBlocks.forEach(({ id, content }) => {
        modifiedContent = modifiedContent.replace(id, content);
        // Also restore inside citation titles so hover cards don't show placeholders
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(id, content);
        }
      });

      codeBlocks.forEach(({ id, content }) => {
        modifiedContent = modifiedContent.replace(id, content);
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(id, content);
        }
      });

      return {
        processedContent: modifiedContent,
        citations,
        latexBlocks,
        isProcessing: false,
      };
    } catch (_error) {
      return {
        processedContent: content,
        citations: [],
        latexBlocks: [],
        isProcessing: false,
      };
    }
  }, [content]);
};

const InlineCode: React.FC<{ code: string; elementKey: string }> = React.memo(
  ({ code }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
        toast.success("Code copied to clipboard");
      } catch (_error) {
        toast.error("Failed to copy code");
      }
    }, [code]);

    return (
      <code
        className={cn(
          "inline rounded px-1 py-0.5 font-mono text-[0.9em]",
          "bg-muted/50",
          "text-foreground/85",
          "before:content-none after:content-none",
          "cursor-pointer transition-colors duration-150 hover:bg-muted/70",
          "align-baseline",
          isCopied && "bg-primary/5 ring-1 ring-primary/30"
        )}
        onClick={handleCopy}
        style={{
          fontFamily: geistMono.style.fontFamily,
          fontSize: "0.85em",
          lineHeight: "inherit",
        }}
        title={isCopied ? "Copied!" : "Click to copy"}
      >
        {code}
      </code>
    );
  }
);

InlineCode.displayName = "InlineCode";

const MarkdownTableWithActions: React.FC<{ children: React.ReactNode }> =
  React.memo(({ children }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [showActions, setShowActions] = useState(false);

    const csvUtils = useMemo(
      () => ({
        escapeCsvValue: (value: string): string => {
          const needsQuotes = /[",\n]/.test(value);
          const escaped = value.replace(/"/g, '""');
          return needsQuotes ? `"${escaped}"` : escaped;
        },
        buildCsvFromTable: (table: HTMLTableElement): string => {
          const rows = Array.from(
            table.querySelectorAll("tr")
          ) as HTMLTableRowElement[];
          const csvLines: string[] = [];
          for (const row of rows) {
            const cells = Array.from(
              row.querySelectorAll("th,td")
            ) as HTMLTableCellElement[];
            if (cells.length > 0) {
              const line = cells
                .map((cell) =>
                  csvUtils.escapeCsvValue(
                    cell.innerText.replace(/\u00A0/g, " ").trim()
                  )
                )
                .join(",");
              csvLines.push(line);
            }
          }
          return csvLines.join("\n");
        },
      }),
      []
    );

    const handleDownloadCsv = useCallback(() => {
      const tableEl = containerRef.current?.querySelector(
        '[data-slot="table"]'
      ) as HTMLTableElement | null;
      if (!tableEl) {
        return;
      }

      try {
        const csv = csvUtils.buildCsvFromTable(tableEl);
        const blob = new Blob([`\uFEFF${csv}`], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const timestamp = new Date()
          .toISOString()
          .replace(/[:T]/g, "-")
          .replace(/\..+/, "");
        a.href = url;
        a.download = `table-${timestamp}.csv`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (_error) {}
    }, [csvUtils]);

    return (
      <div
        className="group relative"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div
          className={cn(
            "-top-3 -right-3 absolute z-10 transition-opacity duration-200",
            showActions
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0 group-hover:opacity-100"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Download CSV"
                className="size-7 rounded-sm text-xs shadow-sm"
                onClick={handleDownloadCsv}
                size="icon"
                variant="outline"
              >
                <Download className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={2}>
              Download CSV
            </TooltipContent>
          </Tooltip>
        </div>
        <div ref={containerRef}>
          <Table className="!border !rounded-lg !m-0">{children}</Table>
        </div>
      </div>
    );
  });

MarkdownTableWithActions.displayName = "MarkdownTableWithActions";

const LinkPreview = React.memo(
  ({ href, title }: { href: string; title?: string }) => {
    const domain = useMemo(() => {
      try {
        return new URL(href).hostname;
      } catch {
        return "";
      }
    }, [href]);

    if (!domain) {
      return null;
    }

    return (
      <div className="m-0 flex flex-col bg-accent text-xs">
        <div className="flex h-6 items-center space-x-1.5 px-2 pt-2 text-muted-foreground text-xs">
          <Image
            alt=""
            className="rounded-sm"
            height={12}
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
            width={12}
          />
          <span className="truncate font-medium">{domain}</span>
        </div>
        {title && (
          <div className="px-2 pt-1 pb-2">
            <h3 className="m-0 line-clamp-3 font-normal text-foreground text-sm">
              {title}
            </h3>
          </div>
        )}
      </div>
    );
  }
);

LinkPreview.displayName = "LinkPreview";

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    const {
      processedContent,
      citations: extractedCitations,
      latexBlocks,
      isProcessing,
    } = useProcessedContent(content);
    const citationLinks = extractedCitations;

    // Optimized element key generation using content hash instead of indices
    const contentHash = useMemo(() => {
      // Simple hash for stable keys
      let hash = 0;
      const str = content.slice(0, 200); // Use first 200 chars for hash
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash;
      }
      return Math.abs(hash).toString(36);
    }, [content]);

    // Use closures to maintain counters without re-creating on each render
    const getElementKey = useMemo(() => {
      const counters = {
        paragraph: 0,
        code: 0,
        heading: 0,
        list: 0,
        listItem: 0,
        blockquote: 0,
        table: 0,
        tableRow: 0,
        tableCell: 0,
        link: 0,
        text: 0,
        hr: 0,
        image: 0,
      };

      return (type: keyof typeof counters, content?: string) => {
        const count = counters[type]++;
        const contentPrefix = content ? content.slice(0, 20) : "";
        return `${contentHash}-${type}-${count}-${contentPrefix}`.replace(
          /[^a-zA-Z0-9-]/g,
          ""
        );
      };
    }, [contentHash]);

    const renderHoverCard = useCallback(
      (
        href: string,
        text: React.ReactNode,
        isCitation = false,
        citationText?: string
      ) => {
        const title = citationText || (typeof text === "string" ? text : "");

        return (
          <HoverCard openDelay={10}>
            <HoverCardTrigger asChild>
              <Link
                className={
                  isCitation
                    ? "-translate-y-[1px] m-0! inline-flex cursor-pointer items-center rounded-sm bg-primary/10 px-1.25 py-0.5 align-baseline font-medium text-primary text-xs leading-none no-underline hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary"
                    : "bg-primary/10 font-medium text-primary no-underline hover:underline"
                }
                href={href}
                target="_blank"
              >
                {text}
              </Link>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              className="w-64 overflow-hidden rounded-md border border-primary/30 bg-background p-0 shadow-lg"
              side="top"
              sideOffset={5}
            >
              <LinkPreview href={href} title={title} />
            </HoverCardContent>
          </HoverCard>
        );
      },
      []
    );

    const renderCitation = useCallback(
      (index: number, citationText: string, href: string, key: string) => (
        <span
          className="relative inline-flex items-baseline whitespace-normal"
          key={key}
        >
          {renderHoverCard(href, index + 1, true, citationText)}
        </span>
      ),
      [renderHoverCard]
    );

    const renderer: Partial<ReactRenderer> = useMemo(
      () => ({
        text(text: string) {
          const blockPattern = /LATEXBLOCK(\d+)END/g;
          const inlinePattern = /LATEXINLINE(\d+)END/g;

          if (!(blockPattern.test(text) || inlinePattern.test(text))) {
            return text;
          }

          blockPattern.lastIndex = 0;
          inlinePattern.lastIndex = 0;

          const components: any[] = [];
          let lastEnd = 0;
          const allMatches: Array<{
            match: RegExpExecArray;
            isBlock: boolean;
          }> = [];

          let match;
          while ((match = blockPattern.exec(text)) !== null) {
            allMatches.push({ match, isBlock: true });
          }
          while ((match = inlinePattern.exec(text)) !== null) {
            allMatches.push({ match, isBlock: false });
          }

          allMatches.sort((a, b) => a.match.index - b.match.index);

          allMatches.forEach(({ match, isBlock }) => {
            const fullMatch = match[0];
            const start = match.index;

            if (start > lastEnd) {
              const textContent = text.slice(lastEnd, start);
              const key = getElementKey("text", textContent);
              components.push(<span key={key}>{textContent}</span>);
            }

            const latexBlock = latexBlocks.find(
              (block) => block.id === fullMatch
            );
            if (latexBlock) {
              const key = getElementKey("text", latexBlock.content);
              if (isBlock) {
                components.push(
                  <Latex
                    delimiters={[
                      { left: "$$", right: "$$", display: true },
                      { left: "\\[", right: "\\]", display: true },
                    ]}
                    key={key}
                    strict={false}
                  >
                    {latexBlock.content}
                  </Latex>
                );
              } else {
                components.push(
                  <Latex
                    delimiters={[
                      { left: "$", right: "$", display: false },
                      { left: "\\(", right: "\\)", display: false },
                    ]}
                    key={key}
                    strict={false}
                  >
                    {latexBlock.content}
                  </Latex>
                );
              }
            }

            lastEnd = start + fullMatch.length;
          });

          if (lastEnd < text.length) {
            const textContent = text.slice(lastEnd);
            const key = getElementKey("text", textContent);
            components.push(<span key={key}>{textContent}</span>);
          }

          return components.length === 1 ? components[0] : components;
        },
        hr() {
          return <></>;
        },
        paragraph(children) {
          const key = getElementKey("paragraph", String(children));

          if (typeof children === "string") {
            const blockMatch = children.match(/^LATEXBLOCK(\d+)END$/);
            if (blockMatch) {
              const latexBlock = latexBlocks.find(
                (block) => block.id === children
              );
              if (latexBlock?.isBlock) {
                return (
                  <div className="my-6 text-center" key={key}>
                    <Latex
                      delimiters={[
                        { left: "$$", right: "$$", display: true },
                        { left: "\\[", right: "\\]", display: true },
                      ]}
                      strict={false}
                    >
                      {latexBlock.content}
                    </Latex>
                  </div>
                );
              }
            }
          }

          return (
            <p
              className={`${isUserMessage ? "!m-0 text-foreground leading-relaxed" : ""} my-5 text-foreground leading-relaxed`}
              key={key}
            >
              {children}
            </p>
          );
        },
        code(children, language) {
          const key = getElementKey("code", String(children));
          return (
            <CodeBlock elementKey={key} key={key} language={language}>
              {String(children)}
            </CodeBlock>
          );
        },
        codespan(code) {
          const codeString =
            typeof code === "string" ? code : String(code || "");
          const key = getElementKey("code", codeString);
          return <InlineCode code={codeString} elementKey={key} key={key} />;
        },
        image(href, title, text) {
          const src = typeof href === "string" ? href : String(href || "");
          const altText =
            typeof text === "string"
              ? text
              : typeof title === "string"
                ? title
                : "";

          if (_isVercelBlobUrl(src)) {
            const key = getElementKey("image", src + altText);
            return (
              <span className="my-4 block" key={key}>
                <Image
                  alt={altText || "Screenshot"}
                  height={700}
                  sizes="100vw"
                  src={src}
                  style={{ width: "100%", height: "auto" }}
                  unoptimized
                  width={1400}
                />
              </span>
            );
          }

          const key = getElementKey("image", src + altText);
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={altText} key={key} src={src} />
          );
        },
        link(href, text) {
          const key = getElementKey("link", href);

          if (href.startsWith("mailto:")) {
            const email = href.replace("mailto:", "");
            return (
              <span className="break-all" key={key}>
                {email}
              </span>
            );
          }

          const linkText = typeof text === "string" ? text : href;

          // For user messages, keep raw text to avoid accidental linkification changes
          if (isUserMessage) {
            if (linkText !== href && linkText !== "") {
              return (
                <span className="break-all" key={key}>
                  {linkText} ({href})
                </span>
              );
            }
            return (
              <span className="break-all" key={key}>
                {href}
              </span>
            );
          }

          // If there's descriptive link text, render a normal anchor with hover preview.
          // This preserves full text inside tables and prevents truncation to citation chips.
          if (linkText && linkText !== href) {
            return renderHoverCard(href, linkText, false);
          }

          // For bare URLs, render as citation chips
          let citationIndex = citationLinks.findIndex(
            (link) => link.link === href
          );
          if (citationIndex === -1) {
            citationLinks.push({ text: href, link: href });
            citationIndex = citationLinks.length - 1;
          }
          const citationText = citationLinks[citationIndex].text;
          return renderCitation(citationIndex, citationText, href, key);
        },
        heading(children, level) {
          const key = getElementKey("heading", String(children));
          const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
          const sizeClasses =
            {
              1: "text-2xl md:text-3xl font-extrabold mt-4 mb-4",
              2: "text-xl md:text-2xl font-bold mt-4 mb-3",
              3: "text-lg md:text-xl font-semibold mt-4 mb-3",
              4: "text-base md:text-lg font-medium mt-4 mb-2",
              5: "text-sm md:text-base font-medium mt-4 mb-2",
              6: "text-xs md:text-sm font-medium mt-4 mb-2",
            }[level] || "";

          return (
            <HeadingTag
              className={`${sizeClasses} text-foreground tracking-tight`}
              key={key}
            >
              {children}
            </HeadingTag>
          );
        },
        list(children, ordered) {
          const key = getElementKey("list");
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              className={`my-5 space-y-2 pl-6 text-foreground ${ordered ? "list-decimal" : "list-disc"}`}
              key={key}
            >
              {children}
            </ListTag>
          );
        },
        listItem(children) {
          const key = getElementKey("listItem");
          return (
            <li className="pl-1 leading-relaxed" key={key}>
              {children}
            </li>
          );
        },
        blockquote(children) {
          const key = getElementKey("blockquote");
          return (
            <blockquote
              className="my-6 rounded-r-md border-primary/30 border-l-4 bg-muted/50 py-1 pl-4 text-foreground italic"
              key={key}
            >
              {children}
            </blockquote>
          );
        },
        table(children) {
          const key = getElementKey("table");
          return (
            <MarkdownTableWithActions key={key}>
              {children}
            </MarkdownTableWithActions>
          );
        },
        tableRow(children) {
          const key = getElementKey("tableRow");
          return <TableRow key={key}>{children}</TableRow>;
        },
        tableCell(children, flags) {
          const key = getElementKey("tableCell");
          const alignClass = flags.align ? `text-${flags.align}` : "text-left";
          const isHeader = flags.header;

          return isHeader ? (
            <TableHead
              className={cn(
                alignClass,
                "!p-2 !m-1 !text-wrap border-border border-r bg-muted/50 font-semibold last:border-r-0"
              )}
              key={key}
            >
              {children}
            </TableHead>
          ) : (
            <TableCell
              className={cn(
                alignClass,
                "!p-2 !m-1 !text-wrap border-border border-r last:border-r-0"
              )}
              key={key}
            >
              {children}
            </TableCell>
          );
        },
        tableHeader(children) {
          const key = getElementKey("table");
          return (
            <TableHeader className="!p-1 !m-1" key={key}>
              {children}
            </TableHeader>
          );
        },
        tableBody(children) {
          const key = getElementKey("table");
          return (
            <TableBody className="!text-wrap !m-1" key={key}>
              {children}
            </TableBody>
          );
        },
      }),
      [
        latexBlocks,
        isUserMessage,
        renderCitation,
        renderHoverCard,
        getElementKey,
        citationLinks,
      ]
    );

    // Show a progressive loading state for large content
    if (isProcessing && content.length > 15_000) {
      return (
        <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none font-sans text-foreground">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Processing content ({Math.round(content.length / 1024)}KB)...
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-8 w-2/3 rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none font-sans text-foreground">
        <Marked renderer={renderer}>{processedContent}</Marked>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage
);

MarkdownRenderer.displayName = "MarkdownRenderer";

// Virtual scrolling component for very large content
const VirtualMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Split content into chunks for virtual scrolling
    const contentChunks = useMemo(() => {
      const lines = content.split("\n");
      const chunkSize = 20; // Lines per chunk
      const chunks = [];

      for (let i = 0; i < lines.length; i += chunkSize) {
        chunks.push(lines.slice(i, i + chunkSize).join("\n"));
      }

      return chunks;
    }, [content]);

    const handleScroll = useCallback(() => {
      if (!containerRef.current) {
        return;
      }

      const { scrollTop, clientHeight } = containerRef.current;
      const lineHeight = 24; // Approximate line height
      const start = Math.floor(scrollTop / lineHeight);
      const end = Math.min(
        start + Math.ceil(clientHeight / lineHeight) + 10,
        contentChunks.length
      );

      setVisibleRange({ start: Math.max(0, start - 5), end });
    }, [contentChunks.length]);

    // Only use virtual scrolling for very large content
    if (content.length < 50_000) {
      return (
        <MarkdownRenderer content={content} isUserMessage={isUserMessage} />
      );
    }

    return (
      <div
        className="markdown-body prose prose-neutral dark:prose-invert max-h-96 max-w-none overflow-y-auto font-sans text-foreground"
        onScroll={handleScroll}
        ref={containerRef}
      >
        {contentChunks
          .slice(visibleRange.start, visibleRange.end)
          .map((chunk, index) => (
            <MarkdownRenderer
              content={chunk}
              isUserMessage={isUserMessage}
              key={`chunk-${visibleRange.start + index}`}
            />
          ))}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage
);

VirtualMarkdownRenderer.displayName = "VirtualMarkdownRenderer";

export const CopyButton = React.memo(({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = React.useCallback(async () => {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Copied to clipboard");
  }, [text]);

  return (
    <Button
      className="h-8 rounded-full px-2 text-xs"
      onClick={handleCopy}
      size="sm"
      variant="ghost"
    >
      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
});

CopyButton.displayName = "CopyButton";

// Performance monitoring hook
const usePerformanceMonitor = (_content: string) => {
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  }, []);

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 100) {
    }
  }, []);
};

// Main optimized markdown component with automatic optimization selection
const OptimizedMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    usePerformanceMonitor(content);

    // Automatically choose the best rendering strategy based on content size
    if (content.length > 100_000) {
      return (
        <VirtualMarkdownRenderer
          content={content}
          isUserMessage={isUserMessage}
        />
      );
    }

    return <MarkdownRenderer content={content} isUserMessage={isUserMessage} />;
  },
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage
);

OptimizedMarkdownRenderer.displayName = "OptimizedMarkdownRenderer";

export {
  MarkdownRenderer,
  VirtualMarkdownRenderer,
  OptimizedMarkdownRenderer as default,
};
