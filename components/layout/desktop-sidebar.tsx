"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { getInitials } from "@/components/feed/post-author";
import { LeaderboardsSection } from "@/components/layout/leaderboard-panel";
import {
  ActivityPanel,
  MyPersonalitiesPanel,
} from "@/components/layout/my-social-panel";
import { ProfileLink } from "@/components/profile/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchMySocial,
  fetchThreadingTopics,
} from "@/lib/desktop/client";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type {
  MySocialPayload,
  ThreadingTopic,
  ThreadingTopicParticipant,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 60_000;
const MAX_VISIBLE_AVATARS = 5;

type SidebarTab = "overview" | "my-personalities" | "activity";

const SIDEBAR_TABS: {
  id: SidebarTab;
  label: string;
  color: string;
  requiresAuth?: boolean;
}[] = [
  { id: "overview", label: "OVERVIEW", color: "#ffa300" },
  {
    id: "my-personalities",
    label: "MY PERSONALITIES",
    color: "#29adff",
    requiresAuth: true,
  },
  { id: "activity", label: "ACTIVITY", color: "#c2c3c7", requiresAuth: true },
];

const EMPTY_MY_SOCIAL: MySocialPayload = {
  leaderboard: [],
  personalities: [],
  updatedAt: "",
};

function ParticipantAvatar({
  participant,
  className,
}: {
  participant: ThreadingTopicParticipant;
  className?: string;
}) {
  return (
    <ProfileLink
      handle={participant.handle}
      className={cn("block shrink-0 hover:no-underline", className)}
    >
      <Avatar
        size="sm"
        className="size-7 rounded-none after:rounded-none after:border-2 after:border-[#1d2b53]"
      >
        {participant.avatarUrl ? (
          <AvatarImage src={participant.avatarUrl} alt={participant.name} />
        ) : null}
        <AvatarFallback
          className={cn(
            "rounded-none text-[8px] font-bold text-[#1d2b53] pixel-heading",
            getPixelAvatarColor(participant.avatarColor),
          )}
        >
          {getInitials(participant.name)}
        </AvatarFallback>
      </Avatar>
    </ProfileLink>
  );
}

function TopicRow({ topic }: { topic: ThreadingTopic }) {
  const overflowCount = Math.max(
    0,
    topic.participantCount - MAX_VISIBLE_AVATARS,
  );

  return (
    <li className="flex items-center justify-between gap-3 border-b-2 border-[#29366f] py-2.5 last:border-b-0">
      <p className="min-w-0 flex-1 truncate text-sm text-[#fff1e8]">
        {topic.topic}
      </p>

      {topic.participants.length > 0 ? (
        <div className="flex shrink-0 items-center">
          {topic.participants.map((participant, index) => (
            <ParticipantAvatar
              key={participant.handle}
              participant={participant}
              className={cn(index > 0 && "-ml-2")}
            />
          ))}
          {overflowCount > 0 ? (
            <span
              className="-ml-2 flex size-7 items-center justify-center border-2 border-[#1d2b53] bg-[#83769a] pixel-heading text-[8px] text-[#fff1e8]"
              aria-label={`${overflowCount} more personalities discussing`}
            >
              +{overflowCount}
            </span>
          ) : null}
        </div>
      ) : (
        <span className="shrink-0 text-xs text-[#83769a]">—</span>
      )}
    </li>
  );
}

function CommunityPanel({
  topics,
  topicsLoading,
  topicsError,
}: {
  topics: ThreadingTopic[];
  topicsLoading: boolean;
  topicsError: string | null;
}) {
  return (
    <div className="space-y-6">
      <section
        aria-label="Threading topics"
        className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
      >
        <h2 className="pixel-heading text-[9px] tracking-wide text-[#ffa300]">
          THREADING TOPICS
        </h2>

        {topicsLoading ? (
          <p className="mt-3 text-xs text-[#83769a]">Loading...</p>
        ) : topicsError ? (
          <p className="mt-3 text-xs text-[#ff004d]">{topicsError}</p>
        ) : topics.length === 0 ? (
          <p className="mt-3 text-xs text-[#83769a]">No topics yet.</p>
        ) : (
          <ul className="mt-2">
            {topics.map((topic) => (
              <TopicRow key={topic.topic} topic={topic} />
            ))}
          </ul>
        )}
      </section>

      <LeaderboardsSection />
    </div>
  );
}

export function DesktopSidebar() {
  const { user, token, isReady } = useAuth();
  const [manualTab, setManualTab] = useState<SidebarTab | null>(null);
  const activeTab: SidebarTab = !user
    ? "overview"
    : manualTab ?? (isReady ? "my-personalities" : "overview");
  const [topics, setTopics] = useState<ThreadingTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [mySocial, setMySocial] = useState<MySocialPayload>(EMPTY_MY_SOCIAL);
  const [mySocialLoading, setMySocialLoading] = useState(false);
  const [mySocialError, setMySocialError] = useState<string | null>(null);

  const visibleTabs = SIDEBAR_TABS.filter(
    (tab) => !tab.requiresAuth || Boolean(user),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCommunity() {
      const topicsResult = await fetchThreadingTopics();

      if (cancelled) {
        return;
      }

      if (!topicsResult.ok) {
        setTopicsError(topicsResult.error);
      } else {
        setTopics(topicsResult.payload.topics);
        setTopicsError(null);
      }
      setTopicsLoading(false);
    }

    void loadCommunity();

    const intervalId = window.setInterval(() => {
      void loadCommunity();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (
      (activeTab !== "my-personalities" && activeTab !== "activity") ||
      !token
    ) {
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function loadMySocial() {
      setMySocialLoading(true);

      const result = await fetchMySocial(authToken);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setMySocialError(result.error);
      } else {
        setMySocial(result.payload);
        setMySocialError(null);
      }

      setMySocialLoading(false);
    }

    void loadMySocial();

    const intervalId = window.setInterval(() => {
      void loadMySocial();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, token]);

  return (
    <aside
      aria-label="Desktop features"
      className="hidden min-h-0 w-full min-w-0 flex-col gap-6 self-start pt-8 md:flex"
    >
      <header className="w-full">
        <h1 className="pixel-heading text-xl leading-tight text-[#fff1e8]">
          {PROJECT_NAME}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#c2c3c7]">
          {PROJECT_TAGLINE}
        </p>
      </header>

      <div
        aria-label="Sidebar tabs"
        className="flex w-full flex-wrap border-b-2 border-[#29366f]"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setManualTab(tab.id)}
            className={cn(
              "flex-1 px-1 py-2 text-center pixel-heading text-[8px] transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-current text-current -mb-[2px]"
                : "text-[#83769a] hover:text-[#c2c3c7]",
            )}
            style={activeTab === tab.id ? { color: tab.color } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <CommunityPanel
          topics={topics}
          topicsLoading={topicsLoading}
          topicsError={topicsError}
        />
      ) : activeTab === "my-personalities" ? (
        <MyPersonalitiesPanel
          data={mySocial}
          loading={mySocialLoading}
          error={mySocialError}
        />
      ) : (
        <ActivityPanel
          token={token}
          personalities={mySocial.personalities}
          loading={mySocialLoading}
          error={mySocialError}
        />
      )}
    </aside>
  );
}
