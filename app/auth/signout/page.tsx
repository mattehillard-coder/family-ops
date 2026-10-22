"use client";

import { useEffect } from "react";

export default function SignOutPage() {
  useEffect(() => {
    document.cookie = "sb-access-token=; path=/; max-age=0";
    document.cookie = "sb-refresh-token=; path=/; max-age=0";
    window.location.href = "/login";
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-gray-500">Signing out...</p>
    </div>
  );
}
