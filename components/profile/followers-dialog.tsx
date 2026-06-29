"use client";

import { useEffect, useState } from "react";

import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchProfileFollowers } from "@/lib/profile/client";
import type { AvatarStatus } from "@/lib/types/personality";
import type { ProfileFollower } from "@/lib/types/profile";

type FollowersDialogProps = {
  handle: string;
  followerCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toAvatarSource(follower: ProfileFollower) {
  return {
    name: follower.name,
    handle: follower.handle,
    avatarUrl: follower.avatarUrl,
    avatarStatus: (follower.avatarUrl ? "ready" : "pending") as AvatarStatus,
  };
}

export function FollowersDialog({
  handle,
  followerCount,
  open,
  onOpenChange,
}: FollowersDialogProps) {
  const [followers, setFollowers] = useState<ProfileFollower[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadFollowers() {
      setLoading(true);
      setError(null);

      const result = await fetchProfileFollowers(handle);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setFollowers([]);
        setLoading(false);
        return;
      }

      setFollowers(result.followers);
      setLoading(false);
    }

    void loadFollowers();

    return () => {
      cancelled = true;
    };
  }, [handle, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(70vh,32rem)] overflow-hidden rounded-none border-[3px] border-[#fff1e8] bg-[#1d2b53] p-0 text-[#fff1e8] ring-0 sm:max-w-md pixel-shadow"
      >
        <DialogHeader className="gap-1 border-b-[3px] border-[#fff1e8] bg-[#29366f] px-4 py-4">
          <DialogTitle className="pixel-heading text-[11px] text-[#ffa300] uppercase">
            Followers
          </DialogTitle>
          <p className="text-sm text-[#c2c3c7]">
            {followerCount.toLocaleString()} people follow @{handle}
          </p>
        </DialogHeader>

        <div className="max-h-[min(50vh,24rem)] overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="py-4 text-sm text-[#83769a]">Loading followers...</p>
          ) : error ? (
            <p className="py-4 text-sm text-[#ff004d]">{error}</p>
          ) : followers.length === 0 ? (
            <p className="py-4 text-sm text-[#83769a]">No followers yet.</p>
          ) : (
            <ul className="space-y-3">
              {followers.map((follower) => (
                <li key={follower.id}>
                  <div className="flex items-center gap-3">
                    <ProfileLink handle={follower.handle} className="shrink-0">
                      <PersonalityAvatar
                        personality={toAvatarSource(follower)}
                        size="sm"
                      />
                    </ProfileLink>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[#ffa300]">
                        <ProfileLink handle={follower.handle}>
                          {follower.name}
                        </ProfileLink>
                      </p>
                      <p className="truncate text-sm text-[#c2c3c7]">
                        <ProfileLink handle={follower.handle}>
                          @{follower.handle}
                        </ProfileLink>
                      </p>
                      <p className="mt-0.5 text-xs text-[#83769a]">
                        follows @{handle}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
