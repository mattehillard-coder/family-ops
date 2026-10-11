"use client";

import { createClient } from "@supabase/supabase-js";
import { Suspense, useEffect, useState } from "react";

const CHUNK_SIZE = 3180;

function setSessionCookies(ref: string, sessionJson: string) {
  const key = `sb-${ref}-auth-token`;

  // Clear any old chunks
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name === key || name.startsWith(`${key}.`)) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  });

  if (sessionJson.length <= CHUNK_SIZE) {
    document.cookie = `${key}=${encodeURIComponent(sessionJson)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
  } else {
    for (let i = 0; i * CHUNK_SIZE < sessionJson.length; i++) {
      const chunk = sessionJson.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      document.cookie = `${key}.${i}=${encodeURIComponent(chunk)}; path=/; max-age=31536000; SameSite=Lax; Secure`;
    }
  }
}

function CallbackHandler() {
  const [status, setStatus] = useState("Signing in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const ref = url.replace("https://", "").split(".")[0];
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setError("No authorization code received");
        return;
      }

      setStatus("Exchanging code...");

      const supabase = createClient(url, key, {
        auth: { detectSessionInUrl: false },
      });

      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      if (!data.session) {
        setError("No session returned");
        return;
      }

      setStatus("Setting session...");

      const sessionJson = JSON.stringify(data.session);
      setSessionCookies(ref, sessionJson);

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
