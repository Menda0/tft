"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePostList } from "@/components/profile/profile-post-list";
import { AppBar } from "@/components/layout/app-bar";
import { Separator } from "@/components/ui/separator";
import { fetchProfile, fetchProfilePosts } from "@/lib/profile/client";
import type { ProfilePostItem, ProfilePostType, PublicPersonality } from "@/lib/types/profile";
import { cn } from "@/lib/utils";

const TABS: { id: ProfilePostType; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "replies", label: "Replies" },
  { id: "reposts", label: "Reposts" },
];

const EMPTY_MESSAGES: Record<ProfilePostType, string> = {
  posts: "No posts yet.",
  replies: "No replies yet.",
  reposts: "No reposts yet.",
};

type ProfileViewProps = {
  handle: string;
};

export function ProfileView({ handle }: ProfileViewProps) {
  const router = useRouter();
  const [personality, setPersonality] = useState<PublicPersonality | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ProfilePostType>("posts");
  const [items, setItems] = useState<ProfilePostItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoadingProfile(true);
      const result = await fetchProfile(handle);

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setLoadingProfile(false);
        return;
      }

      setPersonality(result.personality);
      setError(null);
      setLoadingProfile(false);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoadingPosts(true);
      const result = await fetchProfilePosts(handle, activeTab);

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setLoadingPosts(false);
        return;
      }

      setItems(result.items);
      setError(null);
      setLoadingPosts(false);
    }

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, [handle, activeTab]);

  return (
    <>
      <AppBar
        title={personality ? `@${personality.handle}` : `@${handle}`}
        onBack={handleBack}
      />

      {loadingProfile && (
        <p className="px-4 py-6 text-sm text-[#83769a]">Loading profile...</p>
      )}

      {!loadingProfile && error && !personality && (
        <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
      )}

      {personality ? (
        <>
          <ProfileHeader personality={personality} />

          <Separator className="h-[2px] bg-foreground" />

          <div className="flex border-b-[2px] border-foreground">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 px-2 py-3 text-center pixel-heading text-[9px] transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-[#ffa300] text-[#ffa300]"
                    : "text-[#83769a] hover:text-[#c2c3c7]",
                )}
              >
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          {loadingPosts ? (
            <p className="px-4 py-6 text-sm text-[#83769a]">Loading posts...</p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
          ) : (
            <ProfilePostList
              items={items}
              emptyMessage={EMPTY_MESSAGES[activeTab]}
            />
          )}
        </>
      ) : null}
    </>
  );
}
