import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CurrencyConverterProps {
  toolInvocation: any;
  result: any;
}

export const CurrencyConverter = ({
  toolInvocation,
  result,
}: CurrencyConverterProps) => {
  const [amount, setAmount] = useState<string>(
    toolInvocation.input.amount || "1"
  );
  const [error, setError] = useState<string | null>(null);
  const [isSwapped, setIsSwapped] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    } else {
      setError("Please enter a valid number");
    }
  };

  const handleSwap = () => {
    setIsSwapped(!isSwapped);
  };

  const fromCurrency = isSwapped
    ? toolInvocation.input.to
    : toolInvocation.input.from;
  const toCurrency = isSwapped
    ? toolInvocation.input.from
    : toolInvocation.input.to;

  const convertedAmount = result?.convertedAmount
    ? isSwapped
      ? Number.parseFloat(amount) / result.forwardRate
      : (result.convertedAmount / result.amount) * Number.parseFloat(amount)
    : null;

  const exchangeRate = isSwapped ? result?.reverseRate : result?.forwardRate;

  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-950">
      {/* Currency Converter - Responsive Layout */}
      <div className="flex items-center gap-3 sm:flex-row">
        {/* Mobile: Side Layout, Desktop: Horizontal Layout */}

        {/* Currency Inputs Container - Mobile Stacked */}
        <div className="flex-1 space-y-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
          {/* From Currency Input */}
          <div className="relative sm:flex-1">
            <Input
              className="h-11 border-neutral-200 bg-neutral-50 pr-3 pl-12 font-medium text-base transition-colors focus:bg-white sm:h-12 sm:pl-14 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-neutral-950"
              onChange={handleAmountChange}
              placeholder="0"
              type="text"
              value={amount}
            />
            <div className="-translate-y-1/2 absolute top-1/2 left-2.5 sm:left-3">
              <span className="font-semibold text-neutral-600 text-xs sm:text-sm dark:text-neutral-400">
                {fromCurrency}
              </span>
            </div>
          </div>

          {/* Swap Button - Desktop Only (Hidden on Mobile) */}
          <div className="hidden sm:flex">
            <Button
              className="h-8 w-8 rounded-full p-0 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
              onClick={handleSwap}
              size="sm"
              variant="ghost"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
          </div>

          {/* To Currency Output */}
          <div className="flex h-11 items-center rounded-md border border-neutral-200 bg-neutral-50 px-2.5 sm:h-12 sm:flex-1 sm:px-3 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="mr-2 shrink-0 font-semibold text-neutral-600 text-xs sm:mr-3 sm:text-sm dark:text-neutral-400">
              {toCurrency}
            </span>
            {result ? (
              <span className="truncate font-medium text-neutral-900 text-sm sm:text-base dark:text-neutral-100">
                {convertedAmount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </span>
            ) : (
              <div className="flex min-w-0 items-center gap-1.5 text-neutral-500">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="text-sm">...</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs sm:absolute sm:mt-1"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0, y: -5 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Swap Button - Mobile Only (Hidden on Desktop) */}
        <div className="flex items-center sm:hidden">
          <Button
            className="h-10 w-10 touch-manipulation rounded-full p-0 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
            onClick={handleSwap}
            size="sm"
            variant="ghost"
          >
            <ArrowUpDown className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      </div>

      {/* Exchange Rate - Mobile Friendly */}
      {result && exchangeRate && (
        <motion.div
          animate={{ opacity: 1 }}
          className="mt-3 px-2 text-center text-neutral-500 text-xs dark:text-neutral-400"
          initial={{ opacity: 0 }}
        >
          <span className="inline-block">
            1 {fromCurrency} ={" "}
            {exchangeRate?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{" "}
            {toCurrency}
          </span>
        </motion.div>
      )}
    </div>
  );
};
