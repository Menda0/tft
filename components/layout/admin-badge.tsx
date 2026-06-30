"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminConsole } from "@/components/admin/admin-console";
import { useAuth } from "@/components/auth/auth-provider";
import { WalletDropdown } from "@/components/wallet/wallet-dropdown";

export function AdminBadge() {
  const { user, isReady } = useAuth();
  const [consoleOpen, setConsoleOpen] = useState(false);

  if (!isReady || !user) {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] hidden items-center gap-2 md:flex">
        <WalletDropdown variant="desktopBar" />
        {user.role === "admin" ? (
          <>
            <Link
              href="/admin/dashboard"
              className="pixel-border bg-[#ffa300] px-4 py-2 pixel-shadow-sm transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <p className="pixel-heading text-sm leading-none tracking-widest text-[#1d2b53]">
                STATS
              </p>
            </Link>
            <button
              type="button"
              aria-label="Open admin console"
              onClick={() => setConsoleOpen(true)}
              className="pixel-border bg-[#ff004d] px-4 py-2 pixel-shadow-sm transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <p className="pixel-heading text-sm leading-none tracking-widest text-[#fff1e8]">
                ADMIN
              </p>
            </button>
          </>
        ) : null}
      </div>

      {user.role === "admin" ? (
        <AdminConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />
      ) : null}
    </>
  );
}
