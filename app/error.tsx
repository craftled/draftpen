"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 font-sans text-foreground">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6 flex justify-center">
          <Image
            alt="Computer Error"
            className="rounded-lg"
            height={200}
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzE2YzFlNWExYTJjZjkxZDUxOWQ1MmU2ZjA1NjYxNWIzYzVmMWQ5MSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/aYpmlCXgX9dc09dbpl/giphy.gif"
            unoptimized
            width={300}
          />
        </div>

        <h1 className="mb-4 font-be-vietnam-pro text-4xl text-neutral-800 dark:text-neutral-100">
          Something went wrong
        </h1>
        <p className="mb-8 text-lg text-neutral-600 dark:text-neutral-300">
          An error occurred while trying to load this page. Please try again
          later.
        </p>

        <div className="flex justify-center gap-4">
          <Button
            className="flex items-center gap-2 rounded-full px-4 py-2"
            onClick={reset}
            variant="default"
          >
            <RefreshCw size={18} />
            <span>Try again</span>
          </Button>

          <Link href="/">
            <Button
              className="flex items-center gap-2 rounded-full px-4 py-2"
              variant="outline"
            >
              <ArrowLeft size={18} />
              <span>Return to home</span>
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
