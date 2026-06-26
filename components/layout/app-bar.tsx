"use client";

import { AppMenu } from "@/components/layout/app-menu";

type AppBarProps = {
  title: string;
  onBack?: () => void;
};

export function AppBar({ title, onBack }: AppBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-foreground bg-[#29366f]">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="pixel-border-thin bg-[#7e2553] px-2 py-1 text-[10px] leading-none text-[#fff1e8] transition-transform hover:-translate-y-px active:translate-y-px pixel-heading"
              aria-label="Back"
            >
              {"<"}
            </button>
          ) : null}
          <h1 className="truncate pixel-heading text-[11px] leading-normal text-[#ffa300] uppercase">
            {title}
          </h1>
        </div>

        <AppMenu />
      </div>
    </header>
  );
}
