"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingItems, submitOnboarding } from "@/app/actions/onboarding";

interface OnboardingItem {
  obligationId: string;
  title: string;
  category: string;
  type: "last_done" | "lease_end";
  currentValue?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOnboardingItems().then((result) => {
      setItems(result);
      const initial: Record<string, string> = {};
      for (const item of result) {
        if (item.currentValue) {
          initial[item.obligationId] = item.currentValue;
        }
      }
      setValues(initial);
      setLoading(false);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await submitOnboarding(values);
      router.push("/today");
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-6">
        <h1 className="text-xl font-bold">Onboarding</h1>
        <p className="mt-4 text-sm text-gray-400">
          Nothing to fill in yet. Seed household data from the Cards tab first.
        </p>
      </div>
    );
  }

  const groups = groupBy(items, (i) => i.category);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold">Get started</h1>
      <p className="mt-1 text-sm text-gray-500">
        Fill in what you know — skip anything you're not sure about and come
        back later.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        {Object.entries(groups).map(([category, categoryItems]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {category}
            </h2>
            <div className="mt-3 space-y-4">
              {categoryItems.map((item) => (
                <div key={item.obligationId}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {item.title}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {item.type === "last_done" ? "(last done date)" : "(end date)"}
                    </span>
                  </label>
                  <input
                    type="date"
                    value={values[item.obligationId] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [item.obligationId]: e.target.value,
                      }))
                    }
                    className="input"
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/today")}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 active:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save & continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}
