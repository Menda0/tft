"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "login" | "signup";
};

export function LoginDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: LoginDialogProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  function resetForm(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError(null);
    setUsername("");
    setPassword("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm(initialMode);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result =
      mode === "login"
        ? await login(username, password)
        : await signup(username, password);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-none border-[3px] border-[#fff1e8] bg-[#1d2b53] p-0 text-[#fff1e8] ring-0 sm:max-w-md pixel-shadow"
      >
        <DialogHeader className="gap-3 border-b-[3px] border-[#fff1e8] bg-[#29366f] px-4 py-4">
          <DialogTitle className="pixel-heading text-[11px] text-[#ffa300] uppercase">
            {mode === "login" ? "Player Login" : "New Player"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#c2c3c7]">
            {mode === "login"
              ? "Enter your username and password."
              : `Pick a username and password to join ${PROJECT_NAME}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => resetForm("login")}
              className={cn(
                "flex-1 pixel-border-thin px-2 py-2 text-[10px] pixel-heading",
                mode === "login"
                  ? "bg-[#29adff] text-[#1d2b53]"
                  : "bg-[#29366f] text-[#c2c3c7]",
              )}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => resetForm("signup")}
              className={cn(
                "flex-1 pixel-border-thin px-2 py-2 text-[10px] pixel-heading",
                mode === "signup"
                  ? "bg-[#ff004d] text-[#fff1e8]"
                  : "bg-[#29366f] text-[#c2c3c7]",
              )}
            >
              SIGN UP
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs text-[#ffa300]">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your username"
              autoComplete="username"
              className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] placeholder:text-[#83769a] focus-visible:border-[#29adff] focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-[#ffa300]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] placeholder:text-[#83769a] focus-visible:border-[#29adff] focus-visible:ring-0"
            />
          </div>

          {error ? (
            <p className="pixel-border-thin bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1 rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] hover:bg-[#83769a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-none border-2 border-[#fff1e8] bg-[#00e436] text-[#1d2b53] hover:bg-[#29adff] disabled:opacity-60"
            >
              {isSubmitting ? "..." : mode === "login" ? "Enter" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
