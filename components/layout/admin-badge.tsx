"use client";

import { useState } from "react";

import { AdminConsole } from "@/components/admin/admin-console";
import { useAuth } from "@/components/auth/auth-provider";

export function AdminBadge() {
  const { user, isReady } = useAuth();
  const [consoleOpen, setConsoleOpen] = useState(false);

  if (!isReady || user?.role !== "admin") {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] hidden md:block">
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
      </div>

      <AdminConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </>
  );
}
