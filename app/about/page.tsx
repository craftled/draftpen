"use client";

import { GithubLogoIcon } from "@phosphor-icons/react";
import { ArrowUpRight, Bot, Brain, Eye, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
// import { Checkbox } from '@/components/ui/checkbox';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from "next/navigation";
import { ElevenLabsLogo } from "@/components/logos/elevenlabs-logo";
import { ExaLogo } from "@/components/logos/exa-logo";
import { VercelLogo } from "@/components/logos/vercel-logo";
import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import {
  ProAccordion,
  ProAccordionContent,
  ProAccordionItem,
  ProAccordionTrigger,
} from "@/components/ui/pro-accordion";
import { useGitHubStars } from "@/hooks/use-github-stars";

// import removed: pricing and limits not shown on About page

import { SciraLogo } from "@/components/logos/scira-logo";
import { SiteFooter } from "@/components/site-footer";
import { ThemeSwitcher } from "@/components/theme-switcher";

const GITHUB_STARS_K_THRESHOLD = 1000 as const;
const GITHUB_STARS_K_DIVISOR = 1000 as const;

export default function AboutPage() {
  const router = useRouter();
  /*
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showCryptoAlert, setShowCryptoAlert] = useState(true);
  */
  const { data: githubStars, isLoading: isLoadingStars } = useGitHubStars();

  /*
  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem('hasAcceptedTerms');
    if (!hasAcceptedTerms) {
      setShowTermsDialog(true);
    }

    const hasDismissedCryptoAlert = localStorage.getItem('hasDismissedCryptoAlert');
    if (hasDismissedCryptoAlert) {
      setShowCryptoAlert(false);
    }
  }, []);
  */

  /*
  const handleAcceptTerms = () => {
    if (acceptedTerms) {
      setShowTermsDialog(false);
      localStorage.setItem('hasAcceptedTerms', 'true');
    }
  };
  */

  /*
  const handleDismissCryptoAlert = () => {
    setShowCryptoAlert(false);
    localStorage.setItem('hasDismissedCryptoAlert', 'true');
  };
  */

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("query")?.toString();
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Crypto Disclaimer Alert - commented out */}
      {/**
      {showCryptoAlert && (
        <div className="sticky top-0 z-50 border-b border-border bg-amber-50 dark:bg-amber-950/20">
          <Alert className="border-0 rounded-none bg-transparent">
            <AlertDescription className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Scira is not connected to any cryptocurrency tokens or coins. We are purely an AI search engine.
                </span>
              </div>
              <button
                onClick={handleDismissCryptoAlert}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      */}
      {/* Terms Dialog - commented out */}
      {/**
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-background border border-border">
          <div className="p-6 border-b border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <FileText className="size-5" />
                Terms and Privacy
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2">
                Please review our Terms of Service and Privacy Policy before continuing.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[300px] overflow-y-auto">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Terms of Service
              </h3>
              <p className="text-xs text-muted-foreground">
                By using Scira, you agree to our Terms of Service which outline the rules for using our platform.
              </p>
              <Link href="/terms" className="text-xs text-primary hover:underline inline-flex items-center">
                Read full Terms of Service
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Privacy Policy
              </h3>
              <p className="text-xs text-muted-foreground">
                Our Privacy Policy describes how we collect, use, and protect your personal information.
              </p>
              <Link href="/privacy-policy" className="text-xs text-primary hover:underline inline-flex items-center">
                Read full Privacy Policy
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>
          </div>

          <div className="px-6 pt-1 pb-4">
            <div className="flex items-start space-x-3 p-3 rounded-md bg-accent/50 border border-border">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={() => setAcceptedTerms(!acceptedTerms)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2">
            <Button onClick={handleAcceptTerms} disabled={!acceptedTerms} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-border/50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto max-w-6xl px-4 sm:px-1">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link className="group flex justify-items-end gap-1.5" href="/">
              <SciraLogo className="size-7 transition-transform group-hover:scale-110" />
              <span className="font-be-vietnam-pro font-normal text-2xl tracking-tighter">
                Scira
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center md:flex">
              <div className="flex items-center gap-1">
                <Link
                  className="rounded-lg px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent/50 hover:text-foreground"
                  href="/"
                >
                  Search
                </Link>
                <Link
                  className="rounded-lg px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent/50 hover:text-foreground"
                  href="/pricing"
                >
                  Pricing
                </Link>
                <Link
                  className="rounded-lg px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent/50 hover:text-foreground"
                  href="/terms"
                >
                  Terms
                </Link>
                <Link
                  className="rounded-lg px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent/50 hover:text-foreground"
                  href="/privacy-policy"
                >
                  Privacy
                </Link>
              </div>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <Link
                className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-foreground"
                href="https://git.new/scira"
                target="_blank"
              >
                <GithubLogoIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {!isLoadingStars && githubStars && (
                    <Badge className="ml-1 text-xs" variant="secondary">
                      {githubStars > GITHUB_STARS_K_THRESHOLD
                        ? `${(githubStars / GITHUB_STARS_K_DIVISOR).toFixed(1)}k`
                        : githubStars}
                    </Badge>
                  )}
                </span>
              </Link>

              <div className="hidden h-6 w-px bg-border sm:block" />

              <ThemeSwitcher />

              <div className="hidden h-6 w-px bg-border sm:block" />

              <Button
                className="bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => router.push("/")}
                size="sm"
              >
                Try Free
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="px-4 py-24">
        <div className="container mx-auto max-w-4xl space-y-12 text-center">
          <div className="space-y-6">
            <div className="mb-8 flex items-end justify-center gap-1">
              <SciraLogo className="size-12" />
              <h1 className="font-be-vietnam-pro font-normal text-4xl tracking-tighter">
                Scira
              </h1>
            </div>

            <h2 className="mx-auto max-w-3xl font-semibold text-2xl text-foreground md:text-3xl">
              Open Source AI-Powered Search Engine
            </h2>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              A clean, minimalistic search engine with RAG and search grounding
              capabilities. Get accurate, up-to-date answers from reliable
              sources.
            </p>
          </div>

          {/* Search Interface */}
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  className="h-14 w-full rounded-lg border-2 border-border bg-background px-6 pr-20 text-base transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  name="query"
                  placeholder="Ask anything..."
                  type="text"
                />
                <button
                  className="absolute top-2 right-2 h-10 rounded-md bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  type="submit"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-6 text-background transition-colors hover:bg-foreground/90"
              href="https://git.new/scira"
              target="_blank"
            >
              <GithubLogoIcon className="h-4 w-4" />
              <span className="font-medium">View Source</span>
              {!isLoadingStars && githubStars && (
                <Badge className="ml-2" variant="secondary">
                  {githubStars.toLocaleString()}
                </Badge>
              )}
            </Link>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-border px-6 transition-colors hover:border-primary hover:bg-accent"
              href="/"
            >
              <span className="font-medium">Try Now</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="border-border border-y px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
            <div className="space-y-2">
              <div className="font-bold text-3xl">1M+</div>
              <p className="text-muted-foreground">Questions Answered</p>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-3xl">100K+</div>
              <p className="text-muted-foreground">Active Users</p>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-3xl">
                {isLoadingStars ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${githubStars?.toLocaleString() || "9,000"}+`
                )}
              </div>
              <p className="text-muted-foreground">GitHub Stars</p>
            </div>
          </div>
        </div>

        {/* Elegant CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-border/50 bg-muted/50 px-6 py-3 transition-colors hover:border-border">
            <span className="text-muted-foreground text-sm">
              Ready to explore?
            </span>
            <Button
              className="h-8 px-4 font-medium text-xs"
              onClick={() => router.push("/")}
              size="sm"
            >
              Start Searching
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>
      {/* Awards Section */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-semibold text-2xl">
              Recognition & Awards
            </h2>
            <p className="text-muted-foreground">
              Recognized by leading platforms and communities
            </p>
          </div>

          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mb-4">
                <Image
                  alt="Tiny Startups #1 Product"
                  className="mx-auto size-16 object-contain"
                  height={64}
                  src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                  width={64}
                />
              </div>
              <h3 className="mb-1 font-semibold">#1 Product of the Week</h3>
              <p className="text-muted-foreground text-sm">Tiny Startups</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mb-4">
                <Image
                  alt="Peerlist #1 Project"
                  className="mx-auto h-16 w-16 object-contain"
                  height={64}
                  src="/Winner-Medal-Weekly.svg"
                  width={64}
                />
              </div>
              <h3 className="mb-1 font-semibold">#1 Project of the Week</h3>
              <p className="text-muted-foreground text-sm">Peerlist</p>
            </div>
          </div>

          <div className="text-center">
            <a
              className="inline-block"
              href="https://openalternative.co/scira?utm_source=openalternative&utm_medium=badge&utm_campaign=embed&utm_content=tool-scira"
              rel="noopener"
              target="_blank"
            >
              <Image
                alt="Scira badge"
                className="mx-auto"
                height={50}
                src="https://openalternative.co/scira/badge.svg?theme=dark&width=200&height=50"
                width={200}
              />
            </a>
          </div>

          {/* Subtle CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <span>Try our award-winning search</span>
              <Button
                className="h-auto p-0 font-normal text-primary text-sm hover:text-primary/80"
                onClick={() => router.push("/")}
                size="sm"
                variant="link"
              >
                Get started
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="bg-muted/30 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-semibold text-2xl">Key Features</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Built with modern AI technology to provide accurate and reliable
              search results
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Advanced AI Models</h3>
              <p className="text-muted-foreground">
                Uses multiple state-of-the-art AI models to understand and
                answer complex questions accurately.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Real-time Search</h3>
              <p className="text-muted-foreground">
                Combines RAG and search grounding to retrieve up-to-date
                information from reliable sources.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Open Source</h3>
              <p className="text-muted-foreground">
                Fully open source and transparent. Contribute to development or
                self-host your own instance.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Scira Lookout</h3>
              <p className="text-muted-foreground">
                Schedule automated searches to monitor trends and get regular
                updates on topics that matter to you.
              </p>
            </div>
          </div>

          {/* Feature CTA */}
          <div className="mt-16 text-center">
            <div className="mx-auto max-w-md rounded-lg border border-border/50 bg-gradient-to-br from-muted/50 to-muted/30 p-4 sm:p-6">
              <p className="mb-4 text-muted-foreground text-sm">
                Experience all features in action
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  className="w-full px-4 py-2 text-sm sm:w-auto"
                  onClick={() => router.push("/")}
                  size="sm"
                >
                  Try Now
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  className="w-full px-4 py-2 text-sm sm:w-auto"
                  onClick={() => router.push("/lookout")}
                  size="sm"
                  variant="outline"
                >
                  Try Lookout
                  <Eye className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Technology Stack */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-semibold text-2xl">
              Built With Industry Leaders
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Powered by cutting-edge technology from leading companies
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mb-6 flex justify-center">
                <VercelLogo />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Vercel AI SDK</h3>
              <p className="text-muted-foreground text-sm">
                Advanced AI framework powering intelligent responses
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mb-6 flex justify-center">
                <ExaLogo />
              </div>
              <h3 className="mb-2 font-semibold text-lg">Exa Search</h3>
              <p className="text-muted-foreground text-sm">
                Real-time search grounding with reliable sources
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mb-6 flex justify-center">
                <ElevenLabsLogo />
              </div>
              <h3 className="mb-2 font-semibold text-lg">ElevenLabs Voice</h3>
              <p className="text-muted-foreground text-sm">
                Natural voice synthesis with human-like quality
              </p>
            </div>
          </div>

          {/* Tech Stack CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-muted/30 px-4 py-2">
              <span className="text-muted-foreground text-sm">
                Powered by the best
              </span>
              <Button
                asChild
                className="h-6 px-2 text-primary text-xs hover:text-primary/80"
                size="sm"
                variant="ghost"
              >
                <Link href="https://git.new/scira" target="_blank">
                  View source
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Featured on Vercel Section */}
      <section className="border-border border-y px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="font-semibold text-2xl">
                Featured on Vercel&apos;s Blog
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Recognized for our innovative use of AI technology and
                contribution to the developer community through the Vercel AI
                SDK.
              </p>
              <Link
                className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
                href="https://vercel.com/blog/ai-sdk-4-1"
                target="_blank"
              >
                Read the Feature
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border">
              <Image
                alt="Featured on Vercel Blog"
                className="object-cover"
                fill
                src="/vercel-featured.png"
              />
            </div>
          </div>

          {/* Vercel CTA */}
          <div className="mt-12 text-center">
            <div className="mx-auto inline-flex max-w-xs flex-col items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/20 px-4 py-3 sm:max-w-none sm:flex-row sm:px-5">
              <span className="text-center text-muted-foreground text-sm">
                Featured technology
              </span>
              <Button
                className="h-7 w-full px-3 text-xs sm:w-auto"
                onClick={() => router.push("/")}
                size="sm"
              >
                Try it now
                <Sparkles className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-medium text-2xl tracking-tight">
              Pricing
            </h2>
            <p className="mx-auto max-w-lg text-muted-foreground/80">
              Simple, transparent pricing for everyone
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-6">
            {/* Draftpen Pro */}
            <div className="relative flex flex-col rounded-xl border border-primary/30 bg-background p-8 transition-colors hover:border-primary/50">
              <div className="-top-px absolute right-8 left-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <div className="mb-8">
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="font-medium text-xl">Draftpen Pro</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary/80 text-xs">
                    7-day free trial
                  </span>
                </div>
                <p className="mb-4 text-muted-foreground/70">
                  Everything you need for serious work
                </p>
                <p className="text-muted-foreground/80">
                  Start your 7-day free trial. See Pricing page for current
                  monthly price.
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    Unlimited searches
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">All AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">PDF analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    Priority support
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Scira Lookout</span>
                </li>
              </ul>

              <Button
                className="w-full"
                onClick={() => router.push("/pricing")}
              >
                Start 7-day free trial
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="bg-muted/30 px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-semibold text-2xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Find answers to common questions about Scira
            </p>
          </div>

          <ProAccordion className="w-full" collapsible type="single">
            <ProAccordionItem value="item-1">
              <ProAccordionTrigger>What is Scira?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira is an open-source AI-powered search engine that uses RAG
                (Retrieval-Augmented Generation) and search grounding to provide
                accurate, up-to-date answers from reliable sources.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-2">
              <ProAccordionTrigger>
                What&apos;s included in the subscription?
              </ProAccordionTrigger>
              <ProAccordionContent>
                Draftpen is a pro-only service at $99/month with a 7-day free
                trial. You get unlimited searches, access to all premium AI
                models (GPT-4, Claude 3.5, and more), PDF document analysis, web
                research with real-time data, and priority support.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-3">
              <ProAccordionTrigger>
                Are there any discounts available?
              </ProAccordionTrigger>
              <ProAccordionContent>
                We occasionally offer discount codes for special promotions. You
                can apply any available discount codes during checkout through
                Polar.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-4">
              <ProAccordionTrigger>
                Can I cancel my subscription anytime?
              </ProAccordionTrigger>
              <ProAccordionContent>
                Yes, you can cancel your Pro subscription at any time. Your
                benefits will continue until the end of your current billing
                period.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-5">
              <ProAccordionTrigger>
                What AI models does Scira use?
              </ProAccordionTrigger>
              <ProAccordionContent>
                Scira uses a range of advanced AI models including OpenAI GPT
                and Claude to provide the best possible answers for different
                types of queries.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-6">
              <ProAccordionTrigger>
                How does Scira ensure information accuracy?
              </ProAccordionTrigger>
              <ProAccordionContent>
                Scira combines RAG technology with search grounding to retrieve
                information from reliable sources and verify it before providing
                answers. Each response includes source attribution for
                transparency.
              </ProAccordionContent>
            </ProAccordionItem>
          </ProAccordion>

          <div className="mt-12 space-y-6 text-center">
            <p className="text-muted-foreground">
              Have more questions?{" "}
              <a
                className="text-primary transition-colors hover:text-primary/80"
                href="mailto:zaid@scira.ai"
              >
                Contact us
              </a>
            </p>

            {/* FAQ CTA */}
            <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-border/40 bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-medium text-foreground text-sm">
                  Ready to get started?
                </p>
                <p className="text-muted-foreground text-xs">
                  Join thousands using Scira
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  className="w-full px-4 py-2 text-sm sm:w-auto"
                  onClick={() => router.push("/")}
                  size="sm"
                >
                  Start now
                  <Search className="ml-1 h-3 w-3" />
                </Button>
                <Button
                  className="w-full px-4 py-2 text-sm sm:w-auto"
                  onClick={() => router.push("/pricing")}
                  size="sm"
                  variant="outline"
                >
                  View pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
