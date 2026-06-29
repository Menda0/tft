"use client";

import { useState } from "react";

import { FollowersDialog } from "@/components/profile/followers-dialog";

type FollowersCountProps = {
  handle: string;
  count: number;
  className?: string;
  showLabel?: boolean;
};

export function FollowersCount({
  handle,
  count,
  className,
  showLabel = true,
}: FollowersCountProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "mt-3 bg-transparent p-0 text-left text-sm text-[#83769a] transition-colors hover:text-[#c2c3c7]"
        }
      >
        {showLabel ? (
          <>
            <span className="font-bold text-[#fff1e8] hover:underline">
              {count.toLocaleString()}
            </span>
            {" followers"}
          </>
        ) : (
          count.toLocaleString()
        )}
      </button>

      <FollowersDialog
        handle={handle}
        followerCount={count}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
