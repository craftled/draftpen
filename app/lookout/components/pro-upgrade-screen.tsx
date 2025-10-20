"use client";

import {
  AlarmClockIcon,
  Clock01Icon,
  Crown02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LightningIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Navbar } from "./navbar";

type ProUpgradeScreenProps = {
  user: any;
  isProUser: boolean;
  isProStatusLoading: boolean;
};

export function ProUpgradeScreen({
  user,
  isProUser,
  isProStatusLoading,
}: ProUpgradeScreenProps) {
  const router = useRouter();

  return (
    <>
      <Navbar
        isProStatusLoading={isProStatusLoading}
        isProUser={isProUser}
        showProBadge={false}
        user={user}
      />

      {/* Pro upgrade prompt */}
      <div className="flex flex-1 flex-col pt-20">
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
                Lookouts are available for Pro users only. Schedule automated
                searches and get notified when they complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    className="text-primary"
                    color="currentColor"
                    icon={AlarmClockIcon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  <span>Automated scheduled searches</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    className="text-primary"
                    color="currentColor"
                    icon={Clock01Icon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  <span>Custom frequency and timezone</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <LightningIcon className="h-4 w-4 text-primary" />
                  <span>Up to 10 active lookouts</span>
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
    </>
  );
}
