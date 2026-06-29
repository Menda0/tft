"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchPostLikes } from "@/lib/feed/client";
import { useInfiniteScrollObserver } from "@/lib/hooks/use-infinite-scroll-observer";
import type { AvatarStatus } from "@/lib/types/personality";
import type { ProfileFollower } from "@/lib/types/profile";

type PostLikesDialogProps = {
  postId: string;
  likeCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toAvatarSource(liker: ProfileFollower) {
  return {
    name: liker.name,
    handle: liker.handle,
    avatarUrl: liker.avatarUrl,
    avatarStatus: (liker.avatarUrl ? "ready" : "pending") as AvatarStatus,
  };
}

export function PostLikesDialog({
  postId,
  likeCount,
  open,
  onOpenChange,
}: PostLikesDialogProps) {
  const [likers, setLikers] = useState<ProfileFollower[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const likersRef = useRef(likers);

  useEffect(() => {
    likersRef.current = likers;
  }, [likers]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);

    const result = await fetchPostLikes(postId, {
      offset: likersRef.current.length,
    });

    if (!result.ok) {
      setError(result.error);
      setLoadingMore(false);
      return;
    }

    setLikers((current) => [...current, ...result.likers]);
    setHasMore(result.hasMore);
    setError(null);
    setLoadingMore(false);
  }, [hasMore, loadingMore, postId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadLikers() {
      setLoading(true);
      setLoadingMore(false);
      setLikers([]);
      setHasMore(false);
      setError(null);

      const result = await fetchPostLikes(postId);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setLikers([]);
        setLoading(false);
        return;
      }

      setLikers(result.likers);
      setHasMore(result.hasMore);
      setLoading(false);
    }

    void loadLikers();

    return () => {
      cancelled = true;
    };
  }, [open, postId]);

  const loadMoreRef = useInfiniteScrollObserver({
    enabled: open,
    loading,
    loadingMore,
    hasMore,
    onLoadMore: loadMore,
    deps: [likers.length],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(70vh,32rem)] overflow-hidden rounded-none border-[3px] border-[#fff1e8] bg-[#1d2b53] p-0 text-[#fff1e8] ring-0 sm:max-w-md pixel-shadow"
      >
        <DialogHeader className="gap-1 border-b-[3px] border-[#fff1e8] bg-[#29366f] px-4 py-4">
          <DialogTitle className="pixel-heading text-[11px] text-[#ffa300] uppercase">
            Likes
          </DialogTitle>
          <p className="text-sm text-[#c2c3c7]">
            {likeCount.toLocaleString()}{" "}
            {likeCount === 1 ? "person liked this" : "people liked this"}
          </p>
        </DialogHeader>

        <div className="max-h-[min(50vh,24rem)] overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="py-4 text-sm text-[#83769a]">Loading likes...</p>
          ) : error ? (
            <p className="py-4 text-sm text-[#ff004d]">{error}</p>
          ) : likers.length === 0 ? (
            <p className="py-4 text-sm text-[#83769a]">No likes yet.</p>
          ) : (
            <ul className="space-y-3">
              {likers.map((liker) => (
                <li key={liker.id}>
                  <div className="flex items-center gap-3">
                    <ProfileLink handle={liker.handle} className="shrink-0">
                      <PersonalityAvatar
                        personality={toAvatarSource(liker)}
                        size="sm"
                      />
                    </ProfileLink>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[#ffa300]">
                        <ProfileLink handle={liker.handle}>
                          {liker.name}
                        </ProfileLink>
                      </p>
                      <p className="truncate text-sm text-[#c2c3c7]">
                        <ProfileLink handle={liker.handle}>
                          @{liker.handle}
                        </ProfileLink>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hasMore ? (
            <div ref={loadMoreRef} className="py-4 text-center">
              {loadingMore ? (
                <p className="text-sm text-[#83769a]">Loading more likes...</p>
              ) : (
                <p className="text-sm text-[#83769a]">Scroll for more</p>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
