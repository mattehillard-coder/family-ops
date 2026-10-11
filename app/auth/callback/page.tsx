"use client";

import { createClient } from "@supabase/supabase-js";
import { Suspense, useEffect, useState } from "react";

const CHUNK_SIZE = 3180;

function setSessionCookies(ref: string, sessionJson: string) {
  const key = `sb-${ref}-auth-token`;

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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const ref = url.replace("https://", "").split(".")[0];

    const supabase = createClient(url, key, {
      auth: { detectSessionInUrl: true },
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("Setting session...");
        const sessionJson = JSON.stringify(session);
        setSessionCookies(ref, sessionJson);
        setStatus("Success! Redirecting...");
        window.location.href = "/";
      }
    });

    const timeout = setTimeout(() => {
      setError("Sign-in timed out. Please try again.");
    }, 10000);

    return () => clearTimeout(timeout);
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
