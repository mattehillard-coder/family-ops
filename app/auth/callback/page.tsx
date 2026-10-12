"use client";

import { createClient } from "@supabase/supabase-js";
import { Suspense, useEffect, useState } from "react";

function CallbackHandler() {
  const [status, setStatus] = useState("Signing in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const supabase = createClient(url, key, {
        auth: { detectSessionInUrl: true, flowType: "implicit" },
      });

      const hash = window.location.hash;
      if (!hash || !hash.includes("access_token")) {
        setError("No sign-in data received. Please try again.");
        return;
      }

      setStatus("Processing sign-in...");

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setError(sessionError?.message ?? "Could not establish session.");
        return;
      }

      const { access_token, refresh_token } = data.session;

      const cookieOpts = "path=/; max-age=604800; SameSite=Lax; Secure";
      document.cookie = `sb-access-token=${access_token}; ${cookieOpts}`;
      document.cookie = `sb-refresh-token=${refresh_token}; ${cookieOpts}`;

      setStatus("Success! Redirecting...");
      window.location.href = "/";
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-red-600">{error}</p>
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
