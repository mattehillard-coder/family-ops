"use client";

import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { Suspense, useEffect, useState } from "react";

function CallbackHandler() {
  const [status, setStatus] = useState("Starting auth exchange...");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      setDebugInfo([...logs]);
    };

    async function handleCallback() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const ref = url.replace("https://", "").split(".")[0];
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");

      log(`Code in URL: ${code ? "yes" : "no"}`);
      log(`Access token in hash: ${accessToken ? "yes" : "no"}`);
      log(`localStorage available: ${typeof localStorage !== "undefined"}`);

      const verifierKey = `sb-${ref}-auth-token-code-verifier`;
      try {
        const verifier = localStorage.getItem(verifierKey);
        log(`Code verifier in localStorage: ${verifier ? `yes (${verifier.length} chars)` : "NO - this is the problem"}`);

        const allKeys = Object.keys(localStorage).filter(k => k.startsWith("sb-"));
        log(`All sb- keys: ${allKeys.length > 0 ? allKeys.join(", ") : "none"}`);
      } catch (e) {
        log(`localStorage error: ${e}`);
      }

      if (!code && !accessToken) {
        setStatus("Error: No code or token in URL");
        return;
      }

      if (code) {
        log("Attempting PKCE code exchange...");
        const jsClient = createClient(url, key, {
          auth: { detectSessionInUrl: false },
        });

        const { data, error } = await jsClient.auth.exchangeCodeForSession(code);

        if (error) {
          log(`Exchange error: ${error.message}`);
          setStatus(`Exchange failed: ${error.message}`);
          return;
        }

        if (!data.session) {
          log("Exchange returned no session");
          setStatus("Exchange failed: no session returned");
          return;
        }

        log("Exchange succeeded! Syncing to cookies...");

        const ssrClient = createBrowserClient(url, key);
        await ssrClient.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        log("Session synced. Redirecting...");
        setStatus("Success! Redirecting...");
        window.location.href = "/";
        return;
      }

      if (accessToken) {
        log("Implicit flow: setting session from hash...");
        const ssrClient = createBrowserClient(url, key);
        const refreshToken = hashParams.get("refresh_token") ?? "";
        await ssrClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        log("Session set. Redirecting...");
        window.location.href = "/";
      }
    }

    handleCallback();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm font-medium">{status}</p>
      {debugInfo.length > 0 && (
        <div className="w-full max-w-md rounded-lg bg-gray-100 p-4 text-xs font-mono space-y-1">
          {debugInfo.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
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
