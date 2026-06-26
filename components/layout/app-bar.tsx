"use client";

import { ArrowLeft } from "lucide-react";

type AppBarProps = {
  title: string;
  onBack?: () => void;
};

export function AppBar({ title, onBack }: AppBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md md:pt-8">
      <div className="flex h-14 items-center gap-1 px-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 rounded-full p-2 text-foreground transition-colors hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      </div>
    </header>
  );
}
