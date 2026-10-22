"use client";

import { Suspense, useEffect, useState } from "react";

function CallbackHandler() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("No sign-in data received. Please try again.");
      return;
    }

    const cookieOpts = "path=/; max-age=604800; SameSite=Lax; Secure";
    document.cookie = `sb-access-token=${accessToken}; ${cookieOpts}`;
    document.cookie = `sb-refresh-token=${refreshToken}; ${cookieOpts}`;

    window.location.href = "/today";
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
