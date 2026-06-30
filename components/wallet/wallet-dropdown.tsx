"use client";

import { Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";

import { useAuth } from "@/components/auth/auth-provider";
import { APP_BAR_ICON_BUTTON_CLASS } from "@/components/layout/app-bar-styles";
import { WalletConnectionPanel } from "@/components/wallet/wallet-connection-panel";
import { listLinkedWalletsRequest } from "@/lib/wallet/client";
import { cn } from "@/lib/utils";

type WalletDropdownProps = {
  variant?: "icon" | "desktopBar";
};

export function WalletDropdown({ variant = "icon" }: WalletDropdownProps) {
  const { user, isReady, token } = useAuth();
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshLinkedState = useCallback(async () => {
    if (!token) {
      setHasLinkedWallet(false);
      return;
    }

    const result = await listLinkedWalletsRequest(token);
    setHasLinkedWallet(result.ok && result.wallets.length > 0);
  }, [token]);

  useEffect(() => {
    void refreshLinkedState();
  }, [refreshLinkedState, isConnected, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!isReady || !user) {
    return null;
  }

  const isDesktopBar = variant === "desktopBar";
  const label =
    isConnected && hasLinkedWallet ? "My Wallet" : "Connect Wallet";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "relative transition-transform hover:-translate-y-px active:translate-y-px",
          isDesktopBar
            ? "pixel-border bg-[#29adff] px-4 py-2 pixel-shadow-sm"
            : `${APP_BAR_ICON_BUTTON_CLASS} bg-[#1d2b53]`,
        )}
      >
        {isDesktopBar ? (
          <p className="pixel-heading text-sm leading-none tracking-widest text-[#1d2b53]">
            {label}
          </p>
        ) : (
          <Wallet className="size-4 text-[#29adff]" strokeWidth={2.5} />
        )}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 w-56 pixel-border bg-[#1d2b53] pixel-shadow-sm right-0",
          )}
        >
          <WalletConnectionPanel
            variant="menu"
            onAction={() => {
              setOpen(false);
              void refreshLinkedState();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
