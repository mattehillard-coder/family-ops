import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sanitize(v: string): string {
  return v.replace(/[^\x00-\xff]/g, "");
}

const safeFetch: typeof fetch = (input, init) => {
  if (init?.headers) {
    const h = new Headers(init.headers as HeadersInit);
    const clean = new Headers();
    h.forEach((v, k) => clean.set(k, sanitize(v)));
    init = { ...init, headers: clean };
  }
  return fetch(input, init);
};

export async function createClient() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("sb-access-token")?.value;
  const accessToken = raw ? sanitize(raw) : undefined;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      global: {
        fetch: safeFetch,
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      },
    }
  );
}

