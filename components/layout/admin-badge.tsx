"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AdminConsole } from "@/components/admin/admin-console";
import { useAuth } from "@/components/auth/auth-provider";
import { LoginDialog } from "@/components/auth/login-dialog";
import { WalletDropdown } from "@/components/wallet/wallet-dropdown";

const DESKTOP_BAR_BUTTON_CLASS =
  "pixel-border px-4 py-2 pixel-shadow-sm transition-transform hover:-translate-y-px active:translate-y-px";

export function AdminBadge() {
  const { user, isReady, logout } = useAuth();
  const [consoleOpen, setConsoleOpen] = useState(false);
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
                <p className="pixel-heading text-sm leading-none tracking-widest text-[#ffa300]">
                  {user.username.toUpperCase()}
                </p>
              </button>

              {userMenuOpen ? (
                <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-44 pixel-border bg-[#1d2b53] pixel-shadow-sm">
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
              <>
                <Link
                  href="/admin/dashboard"
                  className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#ffa300]`}
                >
                  <p className="pixel-heading text-sm leading-none tracking-widest text-[#1d2b53]">
                    STATS
                  </p>
                </Link>
                <button
                  type="button"
                  aria-label="Open admin console"
                  onClick={() => setConsoleOpen(true)}
                  className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#ff004d]`}
                >
                  <p className="pixel-heading text-sm leading-none tracking-widest text-[#fff1e8]">
                    ADMIN
                  </p>
                </button>
              </>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#29adff]`}
            >
              <p className="pixel-heading text-sm leading-none tracking-widest text-[#1d2b53]">
                LOG IN
              </p>
            </button>
            <button
              type="button"
              onClick={() => openLogin("signup")}
              className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#00e436]`}
            >
              <p className="pixel-heading text-sm leading-none tracking-widest text-[#1d2b53]">
                SIGN UP
              </p>
            </button>
          </>
        )}
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        initialMode={loginMode}
      />

      {user?.role === "admin" ? (
        <AdminConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />
      ) : null}
    </>
  );
}
