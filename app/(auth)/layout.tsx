"use client";

import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SciraLogo } from "@/components/logos/scira-logo";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const testimonials = [
  {
    content:
      '"Scira @sciraai is better than Grok at digging up information from X, its own platform! I asked it 3 different queries to help scrape and find some data points I was interested in about my own account and Scira did much much better with insanely accurate answers!"',
    author: "Chris Universe",
    handle: "@chrisuniverseb",
    link: "https://x.com/chrisuniverseb/status/1943025911043100835",
  },
  {
    content:
      '"scira dot ai does a really good job scraping through the reddit mines btw"',
    author: "nyaaier",
    handle: "@nyaaier",
    link: "https://x.com/nyaaier/status/1932810453107065284",
  },
  {
    content:
      "Hi @sciraai, just for curiosity, I searched for myself using its advanced models and in extreme mode to see what results it could generate. And it created this 👇🏻 It is not just the best, it is wild. And the best part is it's 10000% accurate.",
    author: "Aniruddha Dak",
    handle: "@aniruddhadak",
    link: "https://x.com/aniruddhadak/status/1917140602107445545",
  },
  {
    content:
      '"read nothing the whole sem and here I am with @sciraai to top my mid sems !! Literally so good to get all the related diagram, points and even topics from the website my professor uses to teach us 🙌"',
    author: "Rajnandinit",
    handle: "@itsRajnandinit",
    link: "https://x.com/itsRajnandinit/status/1897896134837682288",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="flex h-screen items-center justify-between bg-background">
      <div className="hidden h-full flex-col bg-muted/30 lg:flex lg:w-1/2">
        <div className="flex flex-1 flex-col justify-between p-12">
          <div className="flex items-center gap-2">
            <Link className="flex items-center gap-2" href="/">
              <SciraLogo className="size-8" />
              <span className="font-medium text-lg">Scira AI</span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="mb-3 font-semibold text-3xl text-foreground">
                AI Search that actually understands you
              </h2>
              <p className="text-muted-foreground">
                Skip the ads. Get real answers. From the latest AI models.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
                What people are saying
              </h3>

              <Carousel
                className="w-full"
                opts={{ loop: true }}
                plugins={[
                  Autoplay({
                    delay: 4000,
                    stopOnInteraction: true,
                    stopOnMouseEnter: true,
                  }),
                ]}
                setApi={setApi}
              >
                <CarouselContent>
                  {testimonials.map((testimonial, _index) => (
                    <CarouselItem key={testimonial.link}>
                      <Link
                        className="group block h-full"
                        href={testimonial.link}
                        rel="noopener"
                        target="_blank"
                      >
                        <blockquote className="relative flex h-full flex-col rounded-lg border border-border/50 bg-background/50 p-6 backdrop-blur-sm transition-all duration-200 hover:bg-background/70">
                          <div className="flex-1 text-balance text-muted-foreground text-sm transition-colors group-hover:text-foreground">
                            {testimonial.content}
                          </div>
                          <footer className="mt-3">
                            <div className="flex items-center gap-2">
                              <cite className="font-medium text-foreground text-sm not-italic">
                                {testimonial.author}
                              </cite>
                              <span className="text-muted-foreground text-xs">
                                {testimonial.handle}
                              </span>
                            </div>
                          </footer>
                        </blockquote>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="mt-4 flex items-center justify-center gap-1">
                  {testimonials.map((testimonial, index) => (
                    <button
                      aria-label={`Go to testimonial ${index + 1}`}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        index === current
                          ? "bg-foreground"
                          : "bg-muted-foreground/30"
                      }`}
                      key={testimonial.link}
                      onClick={() => api?.scrollTo(index)}
                      type="button"
                    />
                  ))}
                </div>
              </Carousel>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <a
                className="transition-colors hover:text-foreground"
                href="https://git.new/scira"
                rel="noopener"
                target="_blank"
              >
                Open Source
              </a>
              <span>•</span>
              <span>Live Search</span>
              <span>•</span>
              <span>1M+ Searches served</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Featured on{" "}
              <a
                className="transition-colors hover:text-foreground"
                href="https://vercel.com/blog/ai-sdk-4-1"
                rel="noopener"
                target="_blank"
              >
                Vercel
              </a>{" "}
              •{" "}
              <a
                className="transition-colors hover:text-foreground"
                href="https://peerlist.io/zaidmukaddam/project/scira-ai-20"
                rel="noopener"
                target="_blank"
              >
                #1 Product of the Week on Peerlist
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="flex h-full w-full flex-col items-center justify-center px-4 md:px-8 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
