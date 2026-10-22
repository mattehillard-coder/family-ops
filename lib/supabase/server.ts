import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("sb-access-token")?.value;
  // Strip non-ASCII chars that @supabase/ssr may have injected (U+2022 bug)
  const accessToken = raw?.replace(/[^\x00-\xff]/g, "") || undefined;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      },
    }
  );
}

