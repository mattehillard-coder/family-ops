import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";

export const instant = false;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Family Ops</h1>
      <p className="mt-2 text-sm text-gray-500">
        Signed in as {user.email}
      </p>
      <p className="mt-4 text-sm text-gray-400">
        Today view coming in milestone 2.
      </p>
      <SignOutButton />
    </div>
  );
}
