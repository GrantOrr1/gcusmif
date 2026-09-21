"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

function WelcomeBackModalInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [open, setOpen] = useState(() => searchParams.get("welcome") === "1");

  if (!open || !session?.user?.name) return null;

  const firstName = session.user.name.trim().split(/\s+/)[0];

  function dismiss() {
    setOpen(false);
    router.replace("/", { scroll: false });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-xl">
        <h2 className="text-xl font-bold text-foreground">Welcome Back, {firstName}</h2>
        <button
          onClick={dismiss}
          className="mt-6 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Great to be back!
        </button>
      </div>
    </div>
  );
}

export default function WelcomeBackModal() {
  return (
    <Suspense fallback={null}>
      <WelcomeBackModalInner />
    </Suspense>
  );
}
