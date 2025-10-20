"use client";

import {
  BinocularsIcon,
  Cancel01Icon,
  PlusSignIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/contexts/user-context";
import { useLookouts } from "@/hooks/use-lookouts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  NoActiveLookoutsEmpty,
  NoArchivedLookoutsEmpty,
} from "./components/empty-state";
import { LoadingSkeletons } from "./components/loading-skeleton";
import { LookoutCard } from "./components/lookout-card";
import { LookoutDetailsSidebar } from "./components/lookout-details-sidebar";
import { LookoutForm } from "./components/lookout-form";
// Import our new components
import { Navbar } from "./components/navbar";
import { ProUpgradeScreen } from "./components/pro-upgrade-screen";
import {
  DailyLimitWarning,
  TotalLimitWarning,
} from "./components/warning-card";
import {
  getRandomExamples,
  LOOKOUT_LIMITS,
  timezoneOptions,
} from "./constants";
import { useLookoutForm } from "./hooks/use-lookout-form";
import { formatFrequency } from "./utils/time-utils";

type Lookout = {
  id: string;
  title: string;
  prompt: string;
  frequency: string;
  timezone: string;
  nextRunAt: Date;
  status: "active" | "paused" | "archived" | "running";
  lastRunAt?: Date | null;
  lastRunChatId?: string | null;
  createdAt: Date;
  cronSchedule?: string;
};

export default function LookoutPage() {
  const [activeTab, setActiveTab] = React.useState("active");
  const isMobile = useIsMobile();

  // Random examples state
  const [randomExamples, _setRandomExamples] = React.useState(() =>
    getRandomExamples(3)
  );

  // Sidebar state for lookout details
  const [selectedLookout, setSelectedLookout] = React.useState<Lookout | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Delete dialog state
  const [lookoutToDelete, setLookoutToDelete] = React.useState<string | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Authentication and Pro status
  const { user, isProUser, isLoading: isProStatusLoading } = useUser();
  const router = useRouter();

  // Lookouts data and mutations
  const {
    lookouts: allLookouts,
    isLoading,
    error,
    createLookout,
    updateStatus,
    updateLookout,
    deleteLookout,
    testLookout,
    manualRefresh,
    isPending: isMutating,
  } = useLookouts();

  // Detect user timezone on client with fallback to available options
  const [detectedTimezone, setDetectedTimezone] = React.useState<string>("UTC");

  React.useEffect(() => {
    try {
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Check if the detected timezone is in our options list
      const matchingOption = timezoneOptions.find(
        (option) => option.value === systemTimezone
      );

      if (matchingOption) {
        setDetectedTimezone(systemTimezone);
      } else {
        // Try to find a close match based on common patterns
        let fallbackTimezone = "UTC";

        if (systemTimezone.includes("America/")) {
          if (
            systemTimezone.includes("New_York") ||
            systemTimezone.includes("Montreal") ||
            systemTimezone.includes("Toronto")
          ) {
            fallbackTimezone = "America/New_York";
          } else if (
            systemTimezone.includes("Chicago") ||
            systemTimezone.includes("Winnipeg")
          ) {
            fallbackTimezone = "America/Chicago";
          } else if (
            systemTimezone.includes("Denver") ||
            systemTimezone.includes("Edmonton")
          ) {
            fallbackTimezone = "America/Denver";
          } else if (
            systemTimezone.includes("Los_Angeles") ||
            systemTimezone.includes("Vancouver")
          ) {
            fallbackTimezone = "America/Los_Angeles";
          }
        } else if (systemTimezone.includes("Europe/")) {
          if (systemTimezone.includes("London")) {
            fallbackTimezone = "Europe/London";
          } else if (
            systemTimezone.includes("Paris") ||
            systemTimezone.includes("Berlin") ||
            systemTimezone.includes("Rome")
          ) {
            fallbackTimezone = "Europe/Paris";
          }
        } else if (systemTimezone.includes("Asia/")) {
          if (systemTimezone.includes("Tokyo")) {
            fallbackTimezone = "Asia/Tokyo";
          } else if (
            systemTimezone.includes("Shanghai") ||
            systemTimezone.includes("Beijing")
          ) {
            fallbackTimezone = "Asia/Shanghai";
          } else if (systemTimezone.includes("Singapore")) {
            fallbackTimezone = "Asia/Singapore";
          } else if (
            systemTimezone.includes("Kolkata") ||
            systemTimezone.includes("Mumbai")
          ) {
            fallbackTimezone = "Asia/Kolkata";
          }
        } else if (systemTimezone.includes("Australia/")) {
          if (
            systemTimezone.includes("Sydney") ||
            systemTimezone.includes("Melbourne")
          ) {
            fallbackTimezone = "Australia/Sydney";
          } else if (systemTimezone.includes("Perth")) {
            fallbackTimezone = "Australia/Perth";
          }
        }
        setDetectedTimezone(fallbackTimezone);
      }
    } catch {
      setDetectedTimezone("UTC");
    }
  }, []);

  // Form logic hook
  const formHook = useLookoutForm(detectedTimezone);

  // Redirect non-authenticated users
  React.useEffect(() => {
    if (!(isProStatusLoading || user)) {
      router.push("/sign-in");
    }
  }, [user, isProStatusLoading, router]);

  // Handle error display
  React.useEffect(() => {
    if (error) {
      toast.error("Failed to load lookouts");
    }
  }, [error]);

  // Calculate limits and counts
  const activeDailyLookouts = allLookouts.filter(
    (l: Lookout) => l.frequency === "daily" && l.status === "active"
  ).length;
  const totalLookouts = allLookouts.filter(
    (l: Lookout) => l.status !== "archived"
  ).length;
  const canCreateMore = totalLookouts < LOOKOUT_LIMITS.TOTAL_LOOKOUTS;
  const canCreateDailyMore =
    activeDailyLookouts < LOOKOUT_LIMITS.DAILY_LOOKOUTS;

  // Filter lookouts by tab
  const filteredLookouts = allLookouts.filter((lookout: Lookout) => {
    if (activeTab === "active") {
      return (
        lookout.status === "active" ||
        lookout.status === "paused" ||
        lookout.status === "running"
      );
    }
    if (activeTab === "archived") {
      return lookout.status === "archived";
    }
    return true;
  });

  // Event handlers
  const handleStatusChange = async (
    id: string,
    status: "active" | "paused" | "archived" | "running"
  ) => {
    updateStatus({ id, status });
  };

  const handleDelete = (id: string) => {
    setLookoutToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleTest = (id: string) => {
    testLookout({ id });
  };

  const handleManualRefresh = async () => {
    await manualRefresh();
  };

  const confirmDelete = () => {
    if (lookoutToDelete) {
      deleteLookout({ id: lookoutToDelete });
      setLookoutToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenLookoutDetails = (lookout: Lookout) => {
    setSelectedLookout(lookout);
    setIsSidebarOpen(true);
  };

  const handleEditLookout = (lookout: Lookout) => {
    formHook.populateFormForEdit(lookout);
    setIsSidebarOpen(false);
  };

  const handleLookoutChange = (newLookout: Lookout) => {
    setSelectedLookout(newLookout);
  };

  // Show loading state while checking authentication
  if (isProStatusLoading) {
    return (
      <>
        <Navbar
          isProStatusLoading={isProStatusLoading}
          isProUser={isProUser}
          showProBadge={false}
          user={user}
        />
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <LoadingSkeletons count={3} />
          </div>
        </div>
      </>
    );
  }

  // Show upgrade prompt for non-Pro users
  if (!isProUser) {
    return (
      <ProUpgradeScreen
        isProStatusLoading={isProStatusLoading}
        isProUser={isProUser}
        user={user}
      />
    );
  }

  return (
    <>
      {/* Lookout Details Sidebar */}
      {selectedLookout && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
              isSidebarOpen
                ? "bg-black/10 opacity-100 backdrop-blur-sm"
                : "pointer-events-none bg-black/0 opacity-0 backdrop-blur-0"
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div
            className={`fixed top-0 right-0 z-50 h-screen w-full transform overflow-y-auto border-l bg-background shadow-xl transition-all duration-500 ease-out sm:max-w-xl ${
              isSidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex-shrink-0 border-b px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      color="currentColor"
                      icon={BinocularsIcon}
                      size={16}
                      strokeWidth={1.5}
                    />
                    <span className="font-medium text-sm">Lookout Details</span>
                  </div>
                  <Button
                    className="h-7 w-7 p-0"
                    onClick={() => setIsSidebarOpen(false)}
                    size="sm"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      color="currentColor"
                      icon={Cancel01Icon}
                      size={14}
                      strokeWidth={1.5}
                    />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <LookoutDetailsSidebar
                  allLookouts={allLookouts as any}
                  isOpen={isSidebarOpen}
                  lookout={selectedLookout as any}
                  onEditLookout={handleEditLookout as any}
                  onLookoutChange={handleLookoutChange as any}
                  onOpenChange={setIsSidebarOpen}
                  onTest={handleTest}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex min-h-screen flex-1 flex-col justify-center">
        {/* Navbar */}
        <Navbar
          isProStatusLoading={isProStatusLoading}
          isProUser={isProUser}
          showProBadge={true}
          user={user}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header with Title, Tabs and Actions */}
            <div className="mb-6 space-y-4">
              {/* Title - Always at top */}
              <div className="flex items-center justify-center gap-2">
                <HugeiconsIcon
                  color="currentColor"
                  icon={BinocularsIcon}
                  size={32}
                  strokeWidth={1.5}
                />
                <h1 className="font-be-vietnam-pro font-semibold text-2xl">
                  Scira Lookout
                </h1>
              </div>

              {isMobile ? (
                /* Mobile Layout: Actions first, then Tabs */
                <div className="space-y-3">
                  {/* Action buttons - prominent on mobile */}
                  <div className="flex gap-3">
                    <Drawer
                      onOpenChange={formHook.handleDialogOpenChange}
                      open={formHook.isCreateDialogOpen}
                    >
                      <DrawerTrigger asChild>
                        <Button className="flex-1" disabled={!canCreateMore}>
                          <HugeiconsIcon
                            className="mr-2"
                            color="currentColor"
                            icon={PlusSignIcon}
                            size={16}
                            strokeWidth={1.5}
                          />
                          Add New Lookout
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent className="max-h-[85vh]">
                        <DrawerHeader className="pb-4">
                          <DrawerTitle className="text-lg">
                            {formHook.editingLookout
                              ? "Edit Lookout"
                              : "Create New Lookout"}
                          </DrawerTitle>
                        </DrawerHeader>

                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                          <LookoutForm
                            activeDailyLookouts={activeDailyLookouts}
                            canCreateDailyMore={canCreateDailyMore}
                            canCreateMore={canCreateMore}
                            createLookout={createLookout}
                            formHook={formHook}
                            isMutating={isMutating}
                            totalLookouts={totalLookouts}
                            updateLookout={updateLookout}
                          />
                        </div>
                      </DrawerContent>
                    </Drawer>

                    <Button
                      className="px-3"
                      disabled={isMutating}
                      onClick={handleManualRefresh}
                      title="Refresh lookouts"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className={isMutating ? "animate-spin" : ""}
                        color="currentColor"
                        icon={RefreshIcon}
                        size={16}
                        strokeWidth={1.5}
                      />
                    </Button>
                  </div>

                  {/* Tabs for mobile */}
                  <Tabs onValueChange={setActiveTab} value={activeTab}>
                    <TabsList className="w-full bg-muted">
                      <TabsTrigger className="flex-1" value="active">
                        Active
                      </TabsTrigger>
                      <TabsTrigger className="flex-1" value="archived">
                        Archived
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              ) : (
                /* Desktop Layout: Tabs and Actions side by side */
                <div className="flex items-center justify-between">
                  <Tabs onValueChange={setActiveTab} value={activeTab}>
                    <TabsList className="bg-muted">
                      <TabsTrigger value="active">Active</TabsTrigger>
                      <TabsTrigger value="archived">Archived</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <Button
                      disabled={isMutating}
                      onClick={handleManualRefresh}
                      size="sm"
                      title="Refresh lookouts"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className={isMutating ? "animate-spin" : ""}
                        color="currentColor"
                        icon={RefreshIcon}
                        size={16}
                        strokeWidth={1.5}
                      />
                      <span className="ml-1.5">Refresh</span>
                    </Button>
                    <Dialog
                      onOpenChange={formHook.handleDialogOpenChange}
                      open={formHook.isCreateDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button disabled={!canCreateMore} size="sm">
                          <HugeiconsIcon
                            className="mr-1"
                            color="currentColor"
                            icon={PlusSignIcon}
                            size={16}
                            strokeWidth={1.5}
                          />
                          Add new
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[580px]">
                        <DialogHeader className="pb-4">
                          <DialogTitle className="text-lg">
                            {formHook.editingLookout
                              ? "Edit Lookout"
                              : "Create New Lookout"}
                          </DialogTitle>
                        </DialogHeader>

                        <LookoutForm
                          activeDailyLookouts={activeDailyLookouts}
                          canCreateDailyMore={canCreateDailyMore}
                          canCreateMore={canCreateMore}
                          createLookout={createLookout}
                          formHook={formHook}
                          isMutating={isMutating}
                          totalLookouts={totalLookouts}
                          updateLookout={updateLookout}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>

            {/* Limit Warnings */}
            {!canCreateMore && <TotalLimitWarning />}
            {canCreateMore && !canCreateDailyMore && <DailyLimitWarning />}

            {/* Main Content Tabs */}
            <Tabs className="space-y-6" defaultValue="active" value={activeTab}>
              <TabsContent className="space-y-6" value="active">
                {isLoading ? (
                  <LoadingSkeletons count={3} />
                ) : filteredLookouts.length === 0 ? (
                  <NoActiveLookoutsEmpty />
                ) : (
                  <div className="space-y-3">
                    {filteredLookouts.map((lookout) => (
                      <LookoutCard
                        isMutating={isMutating}
                        key={lookout.id}
                        lookout={lookout}
                        onDelete={handleDelete}
                        onOpenDetails={handleOpenLookoutDetails}
                        onStatusChange={handleStatusChange}
                        onTest={handleTest}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="archived">
                {isLoading ? (
                  <LoadingSkeletons count={2} showActions={false} />
                ) : filteredLookouts.length === 0 ? (
                  <NoArchivedLookoutsEmpty />
                ) : (
                  <div className="space-y-3">
                    {filteredLookouts.map((lookout) => (
                      <LookoutCard
                        isMutating={isMutating}
                        key={lookout.id}
                        lookout={lookout}
                        onDelete={handleDelete}
                        onOpenDetails={handleOpenLookoutDetails}
                        onStatusChange={handleStatusChange}
                        onTest={handleTest}
                        showActions={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Example Cards */}
            <div className="mt-12">
              <h2 className="mb-4 font-semibold text-lg">Example Lookouts</h2>
              <div className="grid grid-cols-1 gap-4 overflow-hidden md:grid-cols-2 lg:grid-cols-3">
                {randomExamples.map((example, index) => (
                  <Card
                    className="group !pb-0 !mb-0 h-full max-h-96 cursor-pointer border shadow-none transition-all duration-200 hover:border-primary/30"
                    key={index}
                    onClick={() => formHook.handleUseExample(example)}
                  >
                    <CardHeader>
                      <CardTitle className="font-medium text-sm transition-colors group-hover:text-primary">
                        {example.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="!mb-0 sm:!-mb-1 mx-3 h-28 grow rounded-t-lg border border-accent bg-accent/50 p-4 transition-all duration-200 group-hover:border-primary/20 group-hover:bg-accent/70 sm:h-28">
                      <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
                        {example.prompt.slice(0, 100)}...
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatFrequency(example.frequency, example.time)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
      >
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lookout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lookout? This action cannot
              be undone and will permanently remove all run history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              className="w-full sm:w-auto"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
