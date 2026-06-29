import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { PROJECT_NAME_BADGE } from "@/lib/brand";

type PhoneFrameProps = {
  children: React.ReactNode;
};

function PhoneHardwareTop() {
  return (
    <div
      aria-hidden
      className="hidden shrink-0 items-center justify-between px-5 py-3 md:flex"
    >
      <div className="flex items-center gap-2">
        <div className="pixel-border-thin size-3 bg-[#29adff]" />
        <div className="size-2 bg-[#00e436]" />
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="pixel-speaker h-2 w-16 border-2 border-[#1d2b53]" />
        <div className="flex gap-1">
          <div className="size-1 bg-[#fff1e8]/50" />
          <div className="size-1 bg-[#fff1e8]/50" />
          <div className="size-1 bg-[#fff1e8]/50" />
        </div>
      </div>

      <div className="pixel-border-thin flex size-5 items-center justify-center bg-[#1d2b53]">
        <div className="size-2 rounded-full bg-[#83769a]" />
      </div>
    </div>
  );
}

function PhoneHardwareBottom() {
  return (
    <div
      aria-hidden
      className="hidden shrink-0 flex-col items-center gap-2 px-5 py-3 md:flex"
    >
      <div className="h-1 w-12 bg-[#fff1e8]/70" />
      <span className="pixel-heading text-[8px] tracking-widest text-[#1d2b53]">
        {PROJECT_NAME_BADGE}
      </span>
    </div>
  );
}

function PhoneSideButtons() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[5px] top-[8.5rem] hidden flex-col gap-2 md:flex"
      >
        <div className="h-10 w-[4px] border-y-2 border-l-2 border-[#fff1e8] bg-[#5a5a78]" />
        <div className="h-6 w-[4px] border-y-2 border-l-2 border-[#fff1e8] bg-[#5a5a78]" />
        <div className="h-6 w-[4px] border-y-2 border-l-2 border-[#fff1e8] bg-[#5a5a78]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[5px] top-[10.5rem] hidden md:block"
      >
        <div className="h-14 w-[4px] border-y-2 border-r-2 border-[#fff1e8] bg-[#ff004d]" />
      </div>
    </>
  );
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <>
      {/* Mobile: full bleed */}
      <div className="min-h-dvh md:hidden">
        <div className="pixel-scanlines min-h-dvh overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>

      {/* Desktop: phone left, sidebar right */}
      <div className="hidden min-h-dvh md:flex md:items-center md:justify-center md:bg-[#0f0f1a] md:p-8 md:[background-image:radial-gradient(#29366f_1px,transparent_1px),linear-gradient(#0f0f1a,#1d2b53)] md:[background-size:16px_16px,100%_100%]">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 grid-cols-[2fr_3fr] items-center gap-10">
          <div className="flex min-w-0 justify-end">
            <div
              aria-label="Phone preview"
              className="relative w-[454px] shrink-0 flex-col md:flex md:h-[min(90dvh,900px)]"
            >
              <PhoneSideButtons />

              <div className="phone-shell-shadow relative flex h-full flex-col border-[3px] border-[#fff1e8] bg-[#83769a] p-3">
                <div className="pointer-events-none absolute inset-x-3 top-0 h-[2px] bg-[#c2c3c7]/60" />
                <div className="pointer-events-none absolute inset-y-3 left-0 w-[2px] bg-[#c2c3c7]/40" />

                <PhoneHardwareTop />

                <div className="relative flex min-h-0 flex-1 flex-col phone-screen-inset bg-[#0a0a2a] p-1">
                  <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
                    <div className="pixel-scanlines min-h-0 flex-1 overflow-y-auto overscroll-contain">
                      {children}
                    </div>
                  </div>
                </div>

                <PhoneHardwareBottom />
              </div>
            </div>
          </div>

          <DesktopSidebar />
        </div>
      </div>
    </>
  );
}
