"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProfileCharacterSheetView } from "@/components/profile/profile-character-sheet";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePostList } from "@/components/profile/profile-post-list";
import { AppBar } from "@/components/layout/app-bar";
import { Separator } from "@/components/ui/separator";
import {
  fetchProfile,
  fetchProfileCharacter,
  fetchProfilePosts,
} from "@/lib/profile/client";
import type {
  ProfileCharacterSheet,
  ProfilePostItem,
  ProfilePostType,
  ProfileTab,
  PublicPersonality,
} from "@/lib/types/profile";
import { cn } from "@/lib/utils";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "replies", label: "Replies" },
  { id: "reposts", label: "Reposts" },
  { id: "character", label: "Character" },
];

const EMPTY_MESSAGES: Record<ProfilePostType, string> = {
  posts: "No posts yet.",
  replies: "No replies yet.",
  reposts: "No reposts yet.",
};

type ProfileViewProps = {
  handle: string;
};

function isPostTab(tab: ProfileTab): tab is ProfilePostType {
  return tab !== "character";
}

export function ProfileView({ handle }: ProfileViewProps) {
  const router = useRouter();
  const [personality, setPersonality] = useState<PublicPersonality | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [items, setItems] = useState<ProfilePostItem[]>([]);
  const [character, setCharacter] = useState<ProfileCharacterSheet | null>(
    null,
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingCharacter, setLoadingCharacter] = useState(false);
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
    if (!isPostTab(activeTab)) {
      return;
    }

    const postTab = activeTab;
    let cancelled = false;

    async function loadPosts() {
      setLoadingPosts(true);
      const result = await fetchProfilePosts(handle, postTab);

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

  useEffect(() => {
    if (activeTab !== "character") {
      return;
    }

    let cancelled = false;

    async function loadCharacter() {
      setLoadingCharacter(true);
      const result = await fetchProfileCharacter(handle);

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setLoadingCharacter(false);
        return;
      }

      setCharacter(result.character);
      setError(null);
      setLoadingCharacter(false);
    }

    void loadCharacter();

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
                  "flex-1 px-1 py-3 text-center pixel-heading text-[8px] transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-[#ffa300] text-[#ffa300]"
                    : "text-[#83769a] hover:text-[#c2c3c7]",
                )}
              >
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          {activeTab === "character" ? (
            loadingCharacter ? (
              <p className="px-4 py-6 text-sm text-[#83769a]">
                Loading character sheet...
              </p>
            ) : error ? (
              <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
            ) : character ? (
              <ProfileCharacterSheetView character={character} />
            ) : null
          ) : loadingPosts ? (
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
