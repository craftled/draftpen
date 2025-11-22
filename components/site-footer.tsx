"use client";

import { GithubLogoIcon, XLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SciraLogo } from "@/components/logos/scira-logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy" },
] as const;

const socialLinks = [
  { href: "https://x.com/craftled_", icon: XLogoIcon, label: "X (Twitter)" },
  {
    href: "https://github.com/craftled/draftpen",
    icon: GithubLogoIcon,
    label: "GitHub",
  },
] as const;

export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer className="border-border border-t px-4 py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <SciraLogo className="size-8" />
            <p className="text-muted-foreground text-sm">
              {new Date().getFullYear()} © Draftpen — AI-first content writing
              software by{" "}
              <a
                className="underline"
                href="https://craftled.com?ref=draftpen"
                rel="noopener"
                target="_blank"
              >
                Craftled
              </a>
              . Built on the open-source foundation of{" "}
              <a
                className="underline"
                href="https://github.com/zaidmukaddam/scira"
                rel="noopener"
                target="_blank"
              >
                Scira
              </a>{" "}
              (AGPL-3.0). Standing on the shoulders of giants.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 md:justify-end">
            {navLinks.map((link) => (
              <Link
                className={cn(
                  "text-muted-foreground text-sm transition-colors hover:text-foreground",
                  pathname === link.href
                    ? "font-medium text-foreground"
                    : undefined
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center gap-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <Link
                  aria-label={label}
                  className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                  href={href}
                  key={href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
