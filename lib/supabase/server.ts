import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sanitize(v: string): string {
  return v.replace(/[^\x00-\xff]/g, "");
}

const safeFetch: typeof fetch = (input, init) => {
  if (init?.headers) {
    const h = new Headers(init.headers as HeadersInit);
    for (const [k, v] of h.entries()) {
      h.set(k, sanitize(v));
    }
    init = { ...init, headers: h };
  }
  return fetch(input, init);
};

export async function createClient() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("sb-access-token")?.value;
  const accessToken = raw ? sanitize(raw) : undefined;

  const supabaseUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const anonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  return createSupabaseClient(supabaseUrl, anonKey, {
    global: {
      fetch: safeFetch,
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
  });
}
