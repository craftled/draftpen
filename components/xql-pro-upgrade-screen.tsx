"use client";

import {
  Crown02Icon,
  DatabaseIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeIcon, XLogoIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type XQLProUpgradeScreenProps = {};

export function XQLProUpgradeScreen({}: XQLProUpgradeScreenProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="mb-8 flex items-center justify-center gap-2 pt-12 font-be-vietnam-pro text-3xl sm:gap-3 sm:pt-14 sm:text-5xl">
        <span className="text-foreground">Scira</span>
        <div className="relative flex items-center">
          <XLogoIcon className="-mr-1 sm:-mr-2 size-8 text-foreground sm:size-12" />
          <h1 className="text-foreground">QL</h1>
          {/* Beta badge as superscript */}
          <div className="-top-2 -right-6 sm:-top-3 sm:-right-8 absolute">
            <div className="rounded-sm bg-primary px-1 py-0.5 font-semibold text-[8px] text-primary-foreground text-xs sm:text-xs">
              BETA
            </div>
          </div>
        </div>
      </div>

      {/* Pro upgrade prompt */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md text-center shadow-none">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <HugeiconsIcon
                className="text-primary-foreground"
                color="currentColor"
                icon={Crown02Icon}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <CardTitle className="text-xl">Pro Feature</CardTitle>
            <CardDescription>
              XQL (X Query Language) is available for Pro users only. Query X
              (Twitter) posts using natural language and get structured results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <HugeiconsIcon
                  className="text-primary"
                  color="currentColor"
                  icon={Search01Icon}
                  size={16}
                  strokeWidth={1.5}
                />
                <span>Natural language X post queries</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CodeIcon className="h-4 w-4 text-primary" />
                <span>SQL-like query generation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HugeiconsIcon
                  className="text-primary"
                  color="currentColor"
                  icon={DatabaseIcon}
                  size={16}
                  strokeWidth={1.5}
                />
                <span>Advanced filtering and search</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => router.push("/new")}
                variant="outline"
              >
                Back to Search
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push("/pricing")}
              >
                <HugeiconsIcon
                  className="mr-2"
                  color="currentColor"
                  icon={Crown02Icon}
                  size={16}
                  strokeWidth={1.5}
                />
                Upgrade to Pro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
