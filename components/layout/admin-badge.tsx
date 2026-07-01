"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { LoginDialog } from "@/components/auth/login-dialog";
import {
  DESKTOP_BAR_BUTTON_CLASS,
  DESKTOP_BAR_BUTTON_LABEL_CLASS,
} from "@/components/layout/app-bar-styles";
import { WalletDropdown } from "@/components/wallet/wallet-dropdown";

export function AdminBadge() {
  const { user, isReady, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "signup">("login");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    const timer = window.setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [userMenuOpen]);

  function openLogin(mode: "login" | "signup") {
    setLoginMode(mode);
    setLoginOpen(true);
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
  }

  if (!isReady) {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] hidden items-center gap-2 md:flex">
        {user ? (
          <>
            <WalletDropdown variant="desktopBar" />
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                aria-label="Account menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((open) => !open)}
                className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#29366f]`}
              >
                <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#ffa300]`}>
                  {user.username.toUpperCase()}
                </span>
              </button>

              {userMenuOpen ? (
                <div className="absolute top-[calc(100%+8px)] right-0 z-[120] w-44 pixel-border bg-[#1d2b53] pixel-shadow-sm">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#7e2553]"
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
            {user.role === "admin" ? (
              <Link
                href="/admin/dashboard"
                className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#ff004d]`}
              >
                <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#fff1e8]`}>
                  ADMIN
                </span>
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#29adff]`}
            >
              <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#1d2b53]`}>
                LOG IN
              </span>
            </button>
            <button
              type="button"
              onClick={() => openLogin("signup")}
              className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#00e436]`}
            >
              <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#1d2b53]`}>
                SIGN UP
              </span>
            </button>
          </>
        )}
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        initialMode={loginMode}
      />
    </>
  );
}
