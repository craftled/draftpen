"use client";

import type { DataUIPart } from "ai";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Search,
  X,
} from "lucide-react";
// /components/multi-search.tsx
import Image from "next/image";
import React from "react";
import PlaceholderImage from "@/components/placeholder-image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CustomUIDataTypes, DataQueryCompletionPart } from "@/lib/types";
import { cn } from "@/lib/utils";

// Types
type SearchImage = {
  url: string;
  description: string;
};

type SearchResult = {
  url: string;
  title: string;
  content: string;
  published_date?: string;
  author?: string;
};

type SearchQueryResult = {
  query: string;
  results: SearchResult[];
  images: SearchImage[];
};

type MultiSearchResponse = {
  searches: SearchQueryResult[];
};

type Topic = "general" | "news";

type MultiSearchArgs = {
  queries?: (string | undefined)[] | string | null;
  maxResults?: (number | undefined)[] | number | null;
  topics?: (Topic | undefined)[] | Topic | null;
  quality?: (("default" | "best") | undefined)[] | ("default" | "best") | null;
};

type NormalizedMultiSearchArgs = {
  queries: string[];
  maxResults: number[];
  topics: Topic[];
  quality: ("default" | "best")[];
};

// Constants
const PREVIEW_IMAGE_COUNT = 5;

// Utility function for favicon
const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch {
    return null;
  }
};

// Source Card Component
const SourceCard: React.FC<{ result: SearchResult; onClick?: () => void }> = ({
  result,
  onClick,
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = getFaviconUrl(result.url);
  const [faviconSrc, setFaviconSrc] = React.useState<string | null>(faviconUrl);
  const hostname = new URL(result.url).hostname.replace("www.", "");

  React.useEffect(() => {
    if (faviconUrl) {
      setImageLoaded(false);
      setFaviconSrc(faviconUrl);
      return;
    }
    setFaviconSrc(null);
    setImageLoaded(true);
  }, [faviconUrl]);

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "rounded-xl p-4 transition-all duration-200",
        "hover:border-neutral-300 dark:hover:border-neutral-700",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          {faviconSrc ? (
            <Image
              alt={`${hostname} icon`}
              className={cn("object-contain", !imageLoaded && "opacity-0")}
              height={24}
              onError={() => {
                setFaviconSrc(null);
                setImageLoaded(true);
              }}
              onLoadingComplete={() => setImageLoaded(true)}
              src={faviconSrc}
              width={24}
            />
          ) : (
            <Globe className="h-5 w-5 text-neutral-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 line-clamp-1 font-medium text-neutral-900 text-sm dark:text-neutral-100">
            {result.title}
          </h3>
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <span className="truncate">{hostname}</span>
            {result.author && (
              <>
                <span>•</span>
                <span className="truncate">{result.author}</span>
              </>
            )}
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="line-clamp-2 text-neutral-600 text-sm leading-relaxed dark:text-neutral-400">
        {result.content}
      </p>
    </div>
  );
};

// Sources Sheet Component
const SourcesSheet: React.FC<{
  searches: SearchQueryResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ searches, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const totalResults = searches.reduce(
    (sum, search) => sum + search.results.length,
    0
  );

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
            <div>
              <h2 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                All Sources
              </h2>
              <p className="mt-0.5 text-neutral-500 text-sm dark:text-neutral-400">
                {totalResults} results from {searches.length} searches
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
              {searches.map((search, searchIndex) => (
                <div key={searchIndex}>
                  <div className="mb-4 flex items-center gap-2">
                    <Badge
                      className="rounded-full px-3 py-1 text-xs"
                      variant="secondary"
                    >
                      <Search className="mr-1.5 h-3 w-3" />
                      {search.query}
                    </Badge>
                    <span className="text-neutral-500 text-xs">
                      {search.results.length} results
                    </span>
                  </div>

                  <div className="space-y-3">
                    {search.results.map((result, resultIndex) => (
                      <a
                        className="block"
                        href={result.url}
                        key={resultIndex}
                        target="_blank"
                      >
                        <SourceCard result={result} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Image Gallery Component
const ImageGallery = React.memo(({ images }: { images: SearchImage[] }) => {
  const [isClient, setIsClient] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const [failedImages, setFailedImages] = React.useState<Set<string>>(
    new Set()
  );
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const displayImages = React.useMemo(
    () => images.slice(0, PREVIEW_IMAGE_COUNT),
    [images]
  );
  const hasMore = images.length > PREVIEW_IMAGE_COUNT;

  const ImageViewer = React.useMemo(
    () => (isMobile ? Drawer : Dialog),
    [isMobile]
  );
  const ImageViewerContent = React.useMemo(
    () => (isMobile ? DrawerContent : DialogContent),
    [isMobile]
  );

  const handleImageClick = React.useCallback((index: number) => {
    setSelectedImage(index);
    setIsOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handlePrevious = React.useCallback(() => {
    setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = React.useCallback(() => {
    setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleImageError = React.useCallback((imageUrl: string) => {
    setFailedImages((prev) => new Set(prev).add(imageUrl));
  }, []);

  const currentImage = React.useMemo(
    () => images[selectedImage],
    [images, selectedImage]
  );

  const gridItemClassName = React.useCallback(
    (index: number) =>
      cn(
        "relative overflow-hidden rounded-lg",
        "bg-neutral-100 dark:bg-neutral-800",
        "transition-all duration-200 hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        index === 0 ? "md:col-span-2 md:row-span-2" : ""
      ),
    []
  );

  const shouldShowOverlay = React.useCallback(
    (index: number) => index === displayImages.length - 1 && hasMore,
    [displayImages.length, hasMore]
  );

  const navigationButtonClassName = React.useMemo(
    () =>
      cn(
        "h-10 w-10 rounded-lg",
        "bg-white/90 dark:bg-neutral-800/90",
        "hover:bg-neutral-100 dark:hover:bg-neutral-700",
        "border border-neutral-200 dark:border-neutral-700",
        "shadow-sm"
      ),
    []
  );

  const viewerContentClassName = React.useMemo(
    () =>
      cn(
        isMobile ? "h-[90vh]" : "h-3/5 w-full! max-w-2xl!",
        "overflow-hidden p-0",
        !isMobile &&
          "border border-neutral-200 shadow-lg dark:border-neutral-800"
      ),
    [isMobile]
  );

  if (!isClient) {
    return <div className="space-y-4" />;
  }

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <div className="grid h-[140px] grid-cols-2 grid-rows-2 gap-2 md:h-[160px] md:grid-cols-4">
        {displayImages.map((image, index) => (
          <button
            className={gridItemClassName(index)}
            key={`${image.url}-${index}`}
            onClick={() => handleImageClick(index)}
          >
            {failedImages.has(image.url) ? (
              <PlaceholderImage
                className="absolute inset-0"
                size="md"
                variant="compact"
              />
            ) : (
              <Image
                alt={
                  image.description?.trim().length
                    ? image.description
                    : `Search image ${index + 1}`
                }
                className="object-cover"
                fill
                onError={() => handleImageError(image.url)}
                sizes="(max-width: 768px) 50vw, 25vw"
                src={image.url}
              />
            )}

            {/* Overlay for last image if there are more */}
            {shouldShowOverlay(index) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="font-medium text-sm text-white">
                  +{images.length - displayImages.length} more
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Image Viewer */}
      <ImageViewer onOpenChange={setIsOpen} open={isOpen}>
        <ImageViewerContent className={viewerContentClassName}>
          {/* A11y titles for Dialog/Drawer */}
          {isMobile ? (
            <DrawerTitle className="sr-only">Image viewer</DrawerTitle>
          ) : (
            <DialogTitle className="sr-only">Image viewer</DialogTitle>
          )}
          <div className="relative h-full w-full bg-white dark:bg-neutral-900">
            {/* Header */}
            <div className="absolute top-0 right-0 left-0 z-50 border-neutral-200 border-b bg-white/95 p-4 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95">
              <div className="flex items-center justify-between">
                <Badge
                  className="rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  variant="secondary"
                >
                  {selectedImage + 1} of {images.length}
                </Badge>
                <Button
                  className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={handleClose}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image Display */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pt-16 pb-16">
              <div className="relative h-full w-full">
                {failedImages.has(currentImage.url) ? (
                  <PlaceholderImage
                    className="absolute inset-0"
                    size="lg"
                    variant="default"
                  />
                ) : (
                  <Image
                    alt={
                      currentImage.description?.trim().length
                        ? currentImage.description
                        : "Selected search image"
                    }
                    className="rounded-lg object-contain"
                    fill
                    onError={() => handleImageError(currentImage.url)}
                    sizes="100vw"
                    src={currentImage.url}
                  />
                )}
              </div>
            </div>

            {/* Navigation */}
            <Button
              className={cn(
                "-translate-y-1/2 absolute top-1/2 left-4",
                navigationButtonClassName
              )}
              onClick={handlePrevious}
              size="icon"
              variant="ghost"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              className={cn(
                "-translate-y-1/2 absolute top-1/2 right-4",
                navigationButtonClassName
              )}
              onClick={handleNext}
              size="icon"
              variant="ghost"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Description */}
            {currentImage.description && (
              <div className="absolute right-0 bottom-0 left-0 border-neutral-200 border-t bg-white/95 p-4 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95">
                <p className="mx-auto max-w-3xl text-center text-neutral-600 text-sm dark:text-neutral-400">
                  {currentImage.description}
                </p>
              </div>
            )}
          </div>
        </ImageViewerContent>
      </ImageViewer>
    </div>
  );
});

ImageGallery.displayName = "ImageGallery";

// Loading State Component
const LoadingState: React.FC<{
  queries: string[];
  annotations: DataUIPart<CustomUIDataTypes>[];
  args: MultiSearchArgs;
}> = ({ queries, annotations, args }) => {
  const _completedCount = annotations.length;
  const totalResults = annotations.reduce((sum, annotation) => {
    const data = annotation.data as
      | DataQueryCompletionPart["data"]
      | undefined;
    return sum + (data?.resultsCount ?? 0);
  }, 0);
  const loadingQueryTagsRef = React.useRef<HTMLDivElement>(null);
  const loadingSkeletonRef = React.useRef<HTMLDivElement>(null);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) {
      return;
    }

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) {
      return;
    }

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

  return (
    <div className="relative isolate w-full space-y-2 overflow-hidden">
      {/* Sources Accordion */}
      <Accordion className="w-full" collapsible type="single">
        <AccordionItem className="border-none" value="sources">
          <AccordionTrigger
            className={cn(
              "group rounded-xl px-4 py-3 hover:no-underline",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200 dark:border-neutral-800",
              "data-[state=open]:rounded-b-none"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-neutral-100 p-1.5 dark:bg-neutral-800">
                  <Globe className="h-3.5 w-3.5 text-neutral-500" />
                </div>
                <h2 className="font-medium text-sm">Sources</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  variant="secondary"
                >
                  {totalResults || "0"}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                "space-y-3 p-2",
                "bg-white dark:bg-neutral-900",
                "border-neutral-200 border-x border-b dark:border-neutral-800",
                "rounded-b-xl"
              )}
            >
              {/* Query badges */}
              <div
                className="no-scrollbar flex gap-2 overflow-x-auto"
                onWheel={handleWheelScroll}
                ref={loadingQueryTagsRef}
              >
                {queries.map((query, i) => {
                  const isCompleted = annotations.some((annotation) => {
                    const data = annotation.data as
                      | DataQueryCompletionPart["data"]
                      | undefined;
                    return (
                      data?.query === query && data?.status === "completed"
                    );
                  });
                  const currentQuality =
                    (args.quality ?? ["default"])[i] || "default";
                  return (
                    <Badge
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all",
                        isCompleted
                          ? "bg-neutral-100 dark:bg-neutral-800"
                          : "bg-neutral-50 text-neutral-400 dark:bg-neutral-900"
                      )}
                      key={i}
                      variant="outline"
                    >
                      {isCompleted ? (
                        <Check className="mr-1.5 h-3 w-3" />
                      ) : (
                        <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      )}
                      <span>{query}</span>
                      {currentQuality === "best" && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                          PRO
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>

              {/* Skeleton cards */}
              <div
                className="no-scrollbar flex gap-3 overflow-x-auto pb-1"
                onWheel={handleWheelScroll}
                ref={loadingSkeletonRef}
              >
                {[...new Array(3)].map((_, i) => (
                  <div
                    className="w-[320px] flex-shrink-0 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                    key={i}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Images skeleton */}
      <div>
        <div className="grid h-[140px] grid-cols-2 grid-rows-2 gap-2 md:h-[160px] md:grid-cols-4">
          {[...new Array(5)].map((_, i) => (
            <div
              className={cn(
                "animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800",
                "relative overflow-hidden",
                i === 0 ? "md:col-span-2 md:row-span-2" : ""
              )}
              key={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Component
const MultiSearch = ({
  result,
  args,
  annotations = [],
}: {
  result: MultiSearchResponse | null;
  args: MultiSearchArgs;
  annotations?: DataQueryCompletionPart[];
}) => {
  const [isClient, setIsClient] = React.useState(false);
  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const queryTagsRef = React.useRef<HTMLDivElement>(null);
  const previewResultsRef = React.useRef<HTMLDivElement>(null);

  // Ensure hydration safety
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) {
      return;
    }

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) {
      return;
    }

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

  // Normalize args to ensure required arrays for UI rendering
  const normalizedArgs = React.useMemo<NormalizedMultiSearchArgs>(
    () => ({
      queries: (Array.isArray(args.queries)
        ? args.queries
        : [args.queries ?? ""]
      ).filter((q): q is string => typeof q === "string" && q.length > 0),
      maxResults: (Array.isArray(args.maxResults)
        ? args.maxResults
        : [args.maxResults ?? 10]
      ).filter((n): n is number => typeof n === "number"),
      topics: (Array.isArray(args.topics)
        ? args.topics
        : [args.topics ?? "general"]
      ).filter((t): t is Topic => t === "general" || t === "news"),
      quality: (Array.isArray(args.quality)
        ? args.quality
        : [args.quality ?? "default"]
      ).filter((q): q is "default" | "best" => q === "default" || q === "best"),
    }),
    [args]
  );

  if (!result) {
    return (
      <LoadingState
        annotations={annotations}
        args={normalizedArgs}
        queries={normalizedArgs.queries}
      />
    );
  }

  const allImages = result.searches.flatMap((search) => search.images);
  const allResults = result.searches.flatMap((search) => search.results);
  const totalResults = allResults.length;

  // Show all results in horizontal scroll
  const previewResults = allResults;

  // Prevent hydration mismatches by only rendering after client-side mount
  if (!isClient) {
    return <div className="w-full space-y-4" />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Sources Accordion */}
      <Accordion
        className="w-full"
        collapsible
        defaultValue="sources"
        type="single"
      >
        <AccordionItem className="border-none" value="sources">
          <AccordionTrigger
            className={cn(
              "group rounded-xl px-4 py-3 hover:no-underline",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200 dark:border-neutral-800",
              "data-[state=open]:rounded-b-none"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-neutral-100 p-1.5 dark:bg-neutral-800">
                  <Globe className="h-3.5 w-3.5 text-neutral-500" />
                </div>
                <h2 className="font-medium text-sm">Sources</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  variant="secondary"
                >
                  {totalResults}
                </Badge>
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
              {/* Query tags */}
              <div
                className="no-scrollbar flex gap-2 overflow-x-auto"
                onWheel={handleWheelScroll}
                ref={queryTagsRef}
              >
                {result.searches.map((search, i) => {
                  const currentQuality = normalizedArgs.quality[i] || "default";
                  return (
                    <Badge
                      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                      key={i}
                      variant="outline"
                    >
                      <Search className="h-3 w-3" />
                      <span>{search.query}</span>
                      {currentQuality === "best" && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                          PRO
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>

              {/* Preview results */}
              <div
                className="no-scrollbar flex gap-3 overflow-x-auto pb-1"
                onWheel={handleWheelScroll}
                ref={previewResultsRef}
              >
                {previewResults.map((result, i) => (
                  <a
                    className="block w-[320px] flex-shrink-0"
                    href={result.url}
                    key={i}
                    target="_blank"
                  >
                    <SourceCard result={result} />
                  </a>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Images */}
      {allImages.length > 0 && (
        <div>
          <ImageGallery images={allImages} />
        </div>
      )}

      {/* Sources Sheet */}
      <SourcesSheet
        onOpenChange={setSourcesOpen}
        open={sourcesOpen}
        searches={result.searches}
      />
    </div>
  );
};

MultiSearch.displayName = "MultiSearch";

export default MultiSearch;
