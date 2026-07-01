"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { APP_BAR_ACTION_BUTTON_CLASS } from "@/components/layout/app-bar-styles";

const ADMIN_MENU_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/rank-npcs", label: "Rank NPCs" },
  { href: "/admin/personalities", label: "Personality catalog" },
] as const;

export function AdminAppMenu() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    closeMenu();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={`${APP_BAR_ACTION_BUTTON_CLASS} bg-[#1d2b53] text-[#fff1e8]`}
        aria-label="Open admin menu"
        aria-expanded={menuOpen}
      >
        MENU
      </button>

      {menuOpen ? (
        <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-52 pixel-border bg-[#1d2b53] pixel-shadow-sm">
          {user ? (
            <div className="border-b-2 border-[#fff1e8] px-3 py-3">
              <p className="pixel-heading text-[9px] text-[#29adff]">ADMIN</p>
              <p className="mt-1 truncate text-sm font-bold text-[#ffa300]">
                {user.username}
              </p>
            </div>
          ) : null}
          {ADMIN_MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className={`block w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm transition-colors hover:bg-[#29366f] ${
                pathname === item.href ||
                (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
                  ? "bg-[#29366f] font-bold text-[#ffa300]"
                  : "text-[#fff1e8]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#7e2553]"
            >
              Log out
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
