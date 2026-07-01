"use client";

import Link from "next/link";

import { APP_BAR_ACTION_BUTTON_CLASS } from "@/components/layout/app-bar-styles";
import { AdminAppMenu } from "@/components/admin/admin-app-menu";
import { WalletDropdown } from "@/components/wallet/wallet-dropdown";

type AdminTopBarProps = {
  title?: string;
  onOpenConsole: () => void;
};

export function AdminTopBar({
  title = "Admin",
  onOpenConsole,
}: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-foreground bg-[#29366f]">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate pixel-heading text-[11px] leading-normal text-[#ffa300] uppercase">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className={`${APP_BAR_ACTION_BUTTON_CLASS} bg-[#29adff] text-[#1d2b53]`}
          >
            GAME
          </Link>
          <button
            type="button"
            onClick={onOpenConsole}
            className={`${APP_BAR_ACTION_BUTTON_CLASS} bg-[#ff004d] text-[#fff1e8]`}
            aria-label="Open admin console"
          >
            CONSOLE
          </button>
          <WalletDropdown variant="icon" />
          <AdminAppMenu />
        </div>
      </div>
    </header>
  );
}
