"use client";

export default function SignOutButton() {
  function handleSignOut() {
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-6 text-sm text-gray-400 underline hover:text-gray-600"
    >
      Sign out
    </button>
  );
}
