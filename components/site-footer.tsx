'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GithubLogoIcon, XLogoIcon } from '@phosphor-icons/react';

import { SciraLogo } from '@/components/logos/scira-logo';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy-policy', label: 'Privacy' },
] as const;

const socialLinks = [
  { href: 'https://x.com/craftled_', icon: XLogoIcon, label: 'X (Twitter)' },
  { href: 'https://github.com/craftled/draftpen', icon: GithubLogoIcon, label: 'GitHub' },
] as const;

export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer className="border-t border-border py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SciraLogo className="size-8" />
            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear()} © Draftpen — AI-first content writing software by{' '}
              <a href="https://craftled.com?ref=draftpen" target="_blank" className="underline">
                Craftled
              </a>
              . Built on the open-source foundation of{' '}
              <a href="https://github.com/zaidmukaddam/scira" target="_blank" className="underline">
                Scira
              </a>{' '}
              (AGPL-3.0). Standing on the shoulders of giants.
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap justify-center md:justify-end">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm text-muted-foreground hover:text-foreground transition-colors',
                  pathname === link.href ? 'text-foreground font-medium' : undefined,
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center gap-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
