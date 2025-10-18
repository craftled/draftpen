import {
  ArrowUpRight,
  Book,
  Calendar,
  ExternalLink,
  User2,
} from "lucide-react";
import React, { useState } from "react";
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
import { cn } from "@/lib/utils";

interface AcademicResult {
  title: string;
  url: string;
  author?: string | null;
  publishedDate?: string;
  summary: string;
}

interface AcademicPapersProps {
  results: AcademicResult[];
}

// Academic Paper Source Card Component
const AcademicSourceCard: React.FC<{
  paper: AcademicResult;
  onClick?: () => void;
}> = ({ paper, onClick }) => {
  // Format authors for display
  const formatAuthors = (author: string | null | undefined) => {
    if (!author) return null;
    const authors = author.split(";").slice(0, 2);
    return authors.join(", ") + (author.split(";").length > 2 ? " et al." : "");
  };

  const formattedAuthors = formatAuthors(paper.author);

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "rounded-xl p-4 transition-all duration-200",
        "hover:border-neutral-300 hover:shadow-sm dark:hover:border-neutral-700",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/20">
          <Book className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 line-clamp-1 font-medium text-neutral-900 text-sm dark:text-neutral-100">
            {paper.title}
          </h3>
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <span className="truncate">Academic Paper</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="mb-3 line-clamp-2 text-neutral-600 text-sm leading-relaxed dark:text-neutral-400">
        {paper.summary.length > 150
          ? paper.summary.substring(0, 150) + "..."
          : paper.summary}
      </p>

      {/* Footer */}
      <div className="space-y-2 border-neutral-100 border-t pt-3 dark:border-neutral-800">
        {formattedAuthors && (
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <User2 className="h-3 w-3" />
            <span className="truncate">{formattedAuthors}</span>
          </div>
        )}
        {paper.publishedDate && (
          <time className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <Calendar className="h-3 w-3" />
            {new Date(paper.publishedDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        )}
      </div>
    </div>
  );
};

// Academic Papers Sheet Component
const AcademicPapersSheet: React.FC<{
  papers: AcademicResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ papers, open, onOpenChange }) => {
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
          <div className="border-neutral-200 border-b px-6 py-5 dark:border-neutral-800">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-md bg-violet-50 p-1.5 dark:bg-violet-900/20">
                <Book className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                All Academic Papers
              </h2>
            </div>
            <p className="text-neutral-500 text-sm dark:text-neutral-400">
              {papers.length} research papers
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3 p-6">
              {papers.map((paper, index) => (
                <a
                  className="block"
                  href={paper.url}
                  key={index}
                  target="_blank"
                >
                  <AcademicSourceCard paper={paper} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

const AcademicPapersCard = ({ results }: AcademicPapersProps) => {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

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
    const isAtLeftEdge = container.scrollLeft <= 1; // Small tolerance for edge detection
    const isAtRightEdge =
      container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!(isAtLeftEdge || isAtRightEdge)) {
      // In middle of scroll area - always handle
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      // At left edge, scrolling right - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      // At right edge, scrolling left - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
    // If at edge and scrolling in direction that would go beyond bounds, let the event continue but without propagation
  };

  // Show first 5 papers in preview
  const previewPapers = results.slice(0, 5);

  return (
    <div className="my-4 w-full space-y-3">
      <Accordion
        className="w-full"
        collapsible
        defaultValue="academic_papers"
        type="single"
      >
        <AccordionItem className="border-none" value="academic_papers">
          <AccordionTrigger
            className={cn(
              "rounded-xl px-4 py-3 hover:no-underline",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200 dark:border-neutral-800",
              "data-[state=open]:rounded-b-none"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-violet-50 p-1.5 dark:bg-violet-900/20">
                  <Book className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="font-medium text-sm">Academic Papers</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  variant="secondary"
                >
                  {results.length}
                </Badge>
                {results.length > 0 && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesSheetOpen(true);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    View all
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                "space-y-3 p-3",
                "bg-white dark:bg-neutral-900",
                "border-neutral-200 border-x border-b dark:border-neutral-800",
                "rounded-b-xl"
              )}
            >
              {/* Preview results */}
              <div
                className="no-scrollbar flex gap-3 overflow-x-auto pb-1"
                onWheel={handleWheelScroll}
              >
                {previewPapers.map((paper, index) => (
                  <a
                    className="block w-[320px] flex-shrink-0"
                    href={paper.url}
                    key={index}
                    target="_blank"
                  >
                    <AcademicSourceCard paper={paper} />
                  </a>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sources Sheet */}
      <AcademicPapersSheet
        onOpenChange={setSourcesSheetOpen}
        open={sourcesSheetOpen}
        papers={results}
      />
    </div>
  );
};

// Memoize the component for better performance
export default React.memo(AcademicPapersCard);
