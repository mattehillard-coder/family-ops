"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedHousehold, clearHousehold } from "@/app/actions/seed";

export function SeedButtonClient() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSeed() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await seedHousehold();
        if ("error" in result) {
          setError(result.error as string);
        } else {
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }

  function handleClear() {
    setError(null);
    startTransition(async () => {
      try {
        await clearHousehold();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={handleSeed}
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Working..." : "Seed household data"}
      </button>
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          {error.includes("already seeded") && (
            <button
              onClick={handleClear}
              disabled={isPending}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 active:bg-red-50 disabled:opacity-50"
            >
              Clear data and try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
