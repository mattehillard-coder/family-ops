import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";

export const instant = false;

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const payload = parseJwt(accessToken);
  const email = payload?.email as string | undefined;

  if (!email) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Family Ops</h1>
      <p className="mt-2 text-sm text-gray-500">Signed in as {email}</p>
      <p className="mt-4 text-sm text-gray-400">
        Today view coming in milestone 2.
      </p>
      <SignOutButton />
    </div>
  );
}
