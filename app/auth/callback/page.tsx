"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Suspense, useEffect, useState } from "react";

function CallbackHandler() {
  const [status, setStatus] = useState("Signing in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setError("No authorization code received");
        return;
      }

      setStatus("Exchanging code...");

      const supabase = createBrowserClient(url, key, {
        auth: { detectSessionInUrl: false },
      });

      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      setStatus("Success! Redirecting...");
      window.location.href = "/";
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-red-600">Auth error: {error}</p>
        <a href="/login" className="text-sm text-blue-600 underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-gray-500">{status}</p>
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
