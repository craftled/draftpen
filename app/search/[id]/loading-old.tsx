export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background font-sans text-foreground transition-all duration-500">
      {/* Navbar skeleton */}
      <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between bg-background/95 p-3 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-4">
          {/* New button skeleton */}
          <div className="animate-pulse rounded-full bg-accent backdrop-blur-xs hover:bg-accent/80">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="h-4 w-4 rounded bg-muted/50" />
              <div className="hidden h-3 w-8 rounded bg-muted/50 sm:block" />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Visibility toggle skeleton */}
          <div className="flex h-8 animate-pulse items-center gap-1.5 rounded-md bg-muted px-3 py-1.5">
            <div className="h-4 w-4 rounded bg-muted-foreground/20" />
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
          </div>
          {/* User profile skeleton */}
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* Main content area */}
      <div className="mt-20 flex w-full flex-col p-2 sm:mt-16 sm:p-4">
        <div className="mx-auto w-full max-w-[95%] space-y-6 p-0 transition-all duration-300 sm:max-w-2xl">
          {/* Messages skeleton */}
          <div className="mb-32 flex flex-col space-y-0">
            <div className="flex-grow">
              {/* User message skeleton */}
              <div className="mb-2">
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="animate-pulse rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                      <div className="space-y-1.5">
                        <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assistant message skeleton */}
              <div className="mb-6 border-neutral-200 border-b pb-6 dark:border-neutral-800">
                <div className="w-full">
                  {/* Scira logo header */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-6 w-6 animate-pulse rounded bg-muted" />
                    <div className="font-be-vietnam-pro font-semibold text-lg">
                      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  </div>

                  {/* Thinking section skeleton */}
                  <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <div className="mb-3 flex animate-pulse items-center gap-2">
                      <div className="h-4 w-4 rounded bg-neutral-300 dark:bg-neutral-700" />
                      <div className="h-4 w-24 rounded bg-neutral-300 dark:bg-neutral-700" />
                    </div>
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-3 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-3 w-4/6 rounded bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                  </div>

                  {/* Tool invocation skeleton */}
                  <div className="mb-4 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <div className="border-neutral-200 border-b bg-neutral-100 p-3 dark:border-neutral-700 dark:bg-neutral-800">
                      <div className="flex animate-pulse items-center gap-2">
                        <div className="h-4 w-4 rounded bg-neutral-300 dark:bg-neutral-700" />
                        <div className="h-4 w-32 rounded bg-neutral-300 dark:bg-neutral-700" />
                      </div>
                    </div>
                    <div className="animate-pulse p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-20 rounded bg-neutral-100 dark:bg-neutral-900" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-20 rounded bg-neutral-100 dark:bg-neutral-900" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Response text skeleton */}
                  <div className="prose prose-neutral dark:prose-invert max-w-none animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="h-4 w-4/6 rounded bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading/streaming message skeleton */}
              <div className="min-h-[calc(100vh-18rem)]">
                <div className="w-full">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="h-6 w-6 animate-pulse rounded bg-muted" />
                    <div className="font-be-vietnam-pro font-semibold text-lg">
                      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="mt-2 ml-8 flex space-x-2">
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-600"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-600"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-600"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed form skeleton at bottom */}
        <div className="fixed right-0 bottom-8 left-0 z-20 mx-auto w-full max-w-[95%] sm:bottom-4 sm:max-w-2xl">
          <div className="flex w-full flex-col">
            {/* Form container */}
            <div className="relative flex w-full flex-col gap-1 rounded-lg bg-transparent font-sans transition-all duration-300">
              <div className="relative">
                {/* Main form container */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-100 transition-colors duration-200 focus-within:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-500">
                  {/* Textarea skeleton */}
                  <div className="animate-pulse px-4 py-4">
                    <div className="h-5 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>

                  {/* Toolbar skeleton */}
                  <div className="flex items-center justify-between rounded-t-none rounded-b-lg border-neutral-200 border-t-0 bg-neutral-100 p-2 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="flex items-center gap-2">
                      {/* Group selector skeleton */}
                      <div className="flex animate-pulse items-center gap-1">
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                      </div>

                      {/* Model switcher skeleton */}
                      <div className="h-8 animate-pulse rounded-full bg-neutral-200 px-3 dark:bg-neutral-800">
                        <div className="h-full w-20" />
                      </div>

                      {/* Extreme mode toggle skeleton */}
                      <div className="h-8 animate-pulse rounded-full bg-neutral-200 px-3 dark:bg-neutral-800">
                        <div className="h-full w-16" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Attachment button skeleton */}
                      <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                      {/* Submit button skeleton */}
                      <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
