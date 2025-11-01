"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
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
            alt="Lost in space"
            className="rounded-lg"
            height={200}
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDI1NDg1YzFjNDYzNDc1YTE0MzlmYzc5MDM4YWU0ZDc0ZTdlMGRjMiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/xTiN0L7EW5trfOvEk0/giphy.gif"
            unoptimized
            width={300}
          />
        </div>

        <h1 className="mb-4 font-sans text-4xl text-neutral-800 dark:text-neutral-100">
          Page not found
        </h1>
        <p className="mb-8 text-lg text-neutral-600 dark:text-neutral-300">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex justify-center">
          <Link href="/new">
            <Button
              className="flex items-center gap-2 rounded-full px-4 py-2"
              variant="default"
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
