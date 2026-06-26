type PhoneFrameProps = {
  children: React.ReactNode;
};

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="min-h-dvh md:flex md:items-center md:justify-center md:bg-zinc-950 md:p-8">
      <div
        aria-label="Phone preview"
        className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background md:h-[min(90dvh,880px)] md:min-h-0 md:rounded-[3rem] md:border md:border-zinc-700/80 md:bg-zinc-900 md:p-3 md:shadow-[0_25px_80px_-12px_rgba(0,0,0,0.75)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[2px] top-[7.5rem] hidden h-16 w-[3px] rounded-l-sm bg-zinc-600 md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[2px] top-[11.5rem] hidden h-10 w-[3px] rounded-l-sm bg-zinc-600 md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[2px] top-[14.5rem] hidden h-10 w-[3px] rounded-l-sm bg-zinc-600 md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[2px] top-[10rem] hidden h-20 w-[3px] rounded-r-sm bg-zinc-600 md:block"
        />

        <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden md:min-h-0 md:rounded-[2.25rem] md:bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute top-3 left-1/2 z-50 hidden h-7 w-[7.5rem] -translate-x-1/2 rounded-full bg-black md:block"
          />

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center md:flex"
          >
            <div className="h-1 w-32 rounded-full bg-foreground/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
