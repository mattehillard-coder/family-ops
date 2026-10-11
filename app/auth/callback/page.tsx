"use client";

import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      window.location.href = "/login?error=auth";
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const jsClient = createClient(url, key);
    jsClient.auth.exchangeCodeForSession(code).then(async ({ data, error: exchangeError }) => {
      if (exchangeError || !data.session) {
        setError(exchangeError?.message ?? "No session returned");
        return;
      }

      const ssrClient = createBrowserClient(url, key);
      await ssrClient.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      window.location.href = "/";
    });
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4">
        <p className="text-sm text-red-600">Auth error: {error}</p>
        <a href="/login" className="text-sm text-blue-600 underline">Back to login</a>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-gray-500">Signing in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
