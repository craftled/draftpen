"use client";

import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  Image as ImageIcon,
  Presentation,
  Search,
} from "lucide-react";
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { CONNECTOR_ICONS } from "@/lib/connectors";
import { cn } from "@/lib/utils";

interface Document {
  documentId: string;
  title: string | null;
  type: string | null;
  chunks: Array<{
    content: string;
    score: number;
    isRelevant: boolean;
  }>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  score: number;
  content?: string | null;
  summary?: string | null;
  provider?: string | null;
  providerConfig?: {
    name: string;
    description: string;
    icon: string;
  } | null;
  url?: string; // URL provided by the tool
}

interface ConnectorsSearchResultsProps {
  results: Document[];
  query: string;
  totalResults: number;
  isLoading?: boolean;
}

// Skeleton Card Component
const SkeletonCard: React.FC = () => {
  return (
    <div className="group rounded-lg border bg-card p-4 transition-colors hover:bg-accent/5">
      {/* Header skeleton */}
      <div className="mb-3 flex items-start gap-3">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 h-4 animate-pulse rounded bg-muted" />
          <div className="mb-1 flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-10 animate-pulse rounded-full bg-muted" />
      </div>

      {/* Content skeleton */}
      <div className="border-t pt-3">
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
};

// Document Card Component
const DocumentCard: React.FC<{ document: Document; onClick?: () => void }> = ({
  document,
  onClick,
}) => {
  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="h-4 w-4" />;

    const lowerType = type.toLowerCase();

    // Images
    if (
      lowerType.includes("image") ||
      lowerType.includes("jpeg") ||
      lowerType.includes("jpg") ||
      lowerType.includes("png") ||
      lowerType.includes("gif") ||
      lowerType.includes("webp")
    ) {
      return <ImageIcon className="h-4 w-4" />;
    }

    // PDFs
    if (lowerType.includes("pdf")) {
      return <FileType className="h-4 w-4" />;
    }

    // Spreadsheets
    if (
      lowerType.includes("sheet") ||
      lowerType.includes("excel") ||
      lowerType.includes("csv")
    ) {
      return <FileSpreadsheet className="h-4 w-4" />;
    }

    // Presentations
    if (
      lowerType.includes("presentation") ||
      lowerType.includes("slides") ||
      lowerType.includes("powerpoint") ||
      lowerType.includes("keynote")
    ) {
      return <Presentation className="h-4 w-4" />;
    }

    // Videos
    if (
      lowerType.includes("video") ||
      lowerType.includes("mp4") ||
      lowerType.includes("mov") ||
      lowerType.includes("avi")
    ) {
      return <FileVideo className="h-4 w-4" />;
    }

    // Audio
    if (
      lowerType.includes("audio") ||
      lowerType.includes("mp3") ||
      lowerType.includes("wav") ||
      lowerType.includes("m4a")
    ) {
      return <FileAudio className="h-4 w-4" />;
    }

    // Code files
    if (
      lowerType.includes("code") ||
      lowerType.includes("javascript") ||
      lowerType.includes("python") ||
      lowerType.includes("html") ||
      lowerType.includes("css") ||
      lowerType.includes("json")
    ) {
      return <FileCode className="h-4 w-4" />;
    }

    // Archives
    if (
      lowerType.includes("zip") ||
      lowerType.includes("rar") ||
      lowerType.includes("tar") ||
      lowerType.includes("archive")
    ) {
      return <FileArchive className="h-4 w-4" />;
    }

    // Text documents
    if (
      lowerType.includes("text") ||
      lowerType.includes("document") ||
      lowerType.includes("doc") ||
      lowerType.includes("rtf")
    ) {
      return <FileText className="h-4 w-4" />;
    }

    // Default fallback
    return <File className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const truncateText = (text: string, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  return (
    <div
      className={cn(
        "group relative bg-card",
        "border",
        "rounded-lg p-4 transition-all duration-200",
        "hover:bg-accent/5",
        "hover:border-accent-foreground/20",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
          {getFileIcon(document.type)}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="mb-2 line-clamp-2 max-h-12 truncate font-medium text-foreground text-sm">
            {document.title || "Untitled Document"}
          </h3>
          <div className="mb-1 flex items-center gap-2">
            {document.providerConfig && (
              <span className="flex items-center gap-1.5">
                {CONNECTOR_ICONS[document.providerConfig.icon] &&
                  React.createElement(
                    CONNECTOR_ICONS[document.providerConfig.icon],
                    {
                      className: "w-3 h-3 flex-shrink-0 text-muted-foreground",
                    }
                  )}
                <span className="truncate text-muted-foreground text-xs">
                  {document.providerConfig.name}
                </span>
              </span>
            )}
            {document.type && (
              <Badge
                className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
                variant="secondary"
              >
                {document.type.replace(/[/_]/g, " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />
            {formatDate(document.updatedAt)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            variant="outline"
          >
            Open
            <ArrowUpRight className="h-3 w-3" />
          </Badge>
        </div>
      </div>

      {/* Content preview */}
      <div className="border-t pt-3">
        <p className="line-clamp-3 max-h-16 text-muted-foreground text-xs leading-relaxed">
          {(() => {
            // Prioritize relevant chunks, then summary, then content
            const relevantChunk = document.chunks?.find(
              (chunk) => chunk.isRelevant
            )?.content;
            if (relevantChunk) {
              return truncateText(relevantChunk, 150);
            }
            if (document.summary) {
              return truncateText(document.summary, 150);
            }
            if (document.content) {
              return truncateText(document.content, 150);
            }
            return "No preview available";
          })()}
        </p>
      </div>
    </div>
  );
};

// Documents Sheet Component
const DocumentsSheet: React.FC<{
  documents: Document[];
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ documents, query, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper onOpenChange={onOpenChange} open={open}>
      <SheetContentWrapper
        className={cn(
          isMobile ? "h-[85vh]" : "w-[600px] sm:max-w-[600px]",
          "p-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-border border-b bg-card px-6 py-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">
                All Documents
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                {documents.length} results for &ldquo;{query}&rdquo;
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="space-y-4 p-6">
              {documents.map((document) => (
                <a
                  className="block"
                  href={document.url || "#"}
                  key={document.documentId}
                  target="_blank"
                >
                  <DocumentCard document={document} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

export function ConnectorsSearchResults({
  results,
  query,
  totalResults,
  isLoading = false,
}: ConnectorsSearchResultsProps) {
  const [isClient, setIsClient] = React.useState(false);
  const [documentsOpen, setDocumentsOpen] = React.useState(false);
  const previewResultsRef = React.useRef<HTMLDivElement>(null);

  // Ensure hydration safety
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) return;

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Always stop propagation first to prevent page scroll interference
    e.stopPropagation();

    // Check scroll position to determine if we should handle the event
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge =
      container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!(isAtLeftEdge || isAtRightEdge)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  if (results.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mb-4 rounded-lg bg-muted p-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground text-lg">
          No documents found
        </h3>
        <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
          No relevant documents were found in your connected files for &ldquo;
          {query}&rdquo;. Make sure your documents are synchronized and try a
          different search term.
        </p>
      </div>
    );
  }

  // Prevent hydration mismatches by only rendering after client-side mount
  if (!isClient) {
    return <div className="w-full space-y-4" />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Documents Accordion */}
      <Accordion
        className="w-full [&_[data-state=closed]>div]:animate-none [&_[data-state=open]>div]:animate-none"
        collapsible
        defaultValue="documents"
        type="single"
      >
        <AccordionItem className="border-none" value="documents">
          <AccordionTrigger
            asChild
            className={cn(
              "group px-4 py-3 hover:no-underline",
              "rounded-lg border bg-card",
              "data-[state=open]:rounded-b-none",
              "[&>svg]:hidden", // Hide default chevron
              "[&[data-state=open]_[data-chevron]]:rotate-180" // Rotate custom chevron when open
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded bg-muted p-1.5">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground text-sm">
                    Connected Documents
                  </h2>
                  {isLoading && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        Searching...
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-full px-2 py-0.5 text-xs"
                  variant="secondary"
                >
                  {isLoading ? "..." : totalResults}
                </Badge>
                {totalResults > 0 && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocumentsOpen(true);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    View all
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
                  data-chevron
                />
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div className="space-y-4 rounded-b-lg border-x border-b bg-card p-4">
              {/* Query badge */}
              <div className="flex gap-2">
                <Badge
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  variant="outline"
                >
                  <Search className="h-3 w-3" />
                  <span>{query}</span>
                </Badge>
              </div>

              {/* Preview results */}
              <div
                className="no-scrollbar flex gap-4 overflow-x-auto pb-2"
                onWheel={handleWheelScroll}
                ref={previewResultsRef}
              >
                {isLoading && results.length === 0 ? (
                  <>
                    {Array.from({ length: 3 }, (_, i) => (
                      <div
                        className="w-[320px] flex-shrink-0"
                        key={`skeleton-${i}`}
                      >
                        <SkeletonCard />
                      </div>
                    ))}
                  </>
                ) : (
                  results.map((document) => (
                    <a
                      className="block w-[320px] flex-shrink-0"
                      href={document.url || "#"}
                      key={document.documentId}
                      target="_blank"
                    >
                      <DocumentCard document={document} />
                    </a>
                  ))
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Documents Sheet */}
      <DocumentsSheet
        documents={results}
        onOpenChange={setDocumentsOpen}
        open={documentsOpen}
        query={query}
      />
    </div>
  );
}
