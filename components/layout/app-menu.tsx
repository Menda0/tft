"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { LoginDialog } from "@/components/auth/login-dialog";

export function AppMenu() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "signup">("login");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function openLogin(mode: "login" | "signup") {
    setLoginMode(mode);
    setMenuOpen(false);
    setLoginOpen(true);
  }

  function handleLogout() {
    logout();
    setMenuOpen(false);
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="pixel-border-thin bg-[#1d2b53] px-2 py-1 text-[10px] leading-none text-[#fff1e8] transition-transform hover:-translate-y-px active:translate-y-px pixel-heading"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          MENU
        </button>

        {menuOpen ? (
          <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-52 pixel-border bg-[#1d2b53] pixel-shadow-sm">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
            >
              Posts
            </Link>
            <Link
              href="/leaderboards"
              onClick={() => setMenuOpen(false)}
              className="block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
            >
              Leaderboards
            </Link>
            {user ? (
              <>
                <div className="border-b-2 border-[#fff1e8] px-3 py-3">
                  <p className="pixel-heading text-[9px] text-[#29adff]">ONLINE</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#ffa300]">
                    {user.username}
                  </p>
                </div>
                <Link
                  href="/personalities"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
                >
                  My personalities
                </Link>
                <Link
                  href="/create-personality"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
                >
                  Create personality
                </Link>
                {user.role === "admin" ? (
                  <>
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
                    >
                      Analytics
                    </Link>
                    <Link
                      href="/admin/rank-npcs"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
                    >
                      Parody NPCs
                    </Link>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#7e2553]"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openLogin("login")}
                  className="w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => openLogin("signup")}
                  className="w-full px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f]"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        initialMode={loginMode}
      />
    </>
  );
}
