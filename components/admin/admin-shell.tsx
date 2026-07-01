"use client";

import { useState } from "react";

import { AdminConsole } from "@/components/admin/admin-console";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { useAuth } from "@/components/auth/auth-provider";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [consoleOpen, setConsoleOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0f0f23] text-[#fff1e8]">
      <AdminTopBar onOpenConsole={() => setConsoleOpen(true)} />
      <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        {children}
      </main>

      {user?.role === "admin" && consoleOpen ? (
        <AdminConsole open onClose={() => setConsoleOpen(false)} />
      ) : null}
    </div>
  );
}
