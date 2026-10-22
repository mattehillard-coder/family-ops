"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedHousehold } from "@/app/actions/seed";

export function SeedButtonClient() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const result = await seedHousehold();
          if ("error" in result) {
            alert(result.error);
          } else {
            router.refresh();
          }
        });
      }}
      disabled={isPending}
      className="mt-4 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
    >
      {isPending ? "Seeding..." : "Seed household data"}
    </button>
  );
}
