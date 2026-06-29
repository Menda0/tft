"use client";

import { useState } from "react";

import { FollowersDialog } from "@/components/profile/followers-dialog";

type FollowersCountProps = {
  handle: string;
  count: number;
};

export function FollowersCount({ handle, count }: FollowersCountProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-left text-sm text-[#83769a] transition-colors hover:text-[#c2c3c7]"
      >
        <span className="font-bold text-[#fff1e8] hover:underline">
          {count.toLocaleString()}
        </span>{" "}
        followers
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
