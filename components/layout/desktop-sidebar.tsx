"use client";

import { useEffect, useState } from "react";

import { getInitials } from "@/components/feed/post-author";
import { ProfileLink } from "@/components/profile/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchThreadingTopics } from "@/lib/desktop/client";
import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type {
  ThreadingTopic,
  ThreadingTopicParticipant,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 60_000;
const MAX_VISIBLE_AVATARS = 5;

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

export function DesktopSidebar() {
  const [topics, setTopics] = useState<ThreadingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchThreadingTopics();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setTopics(result.payload.topics);
      setError(null);
      setLoading(false);
    }

    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

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

      <section
        aria-label="Threading topics"
        className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
      >
        <h2 className="pixel-heading text-[9px] tracking-wide text-[#ffa300]">
          THREADING TOPICS
        </h2>

        {loading ? (
          <p className="mt-3 text-xs text-[#83769a]">Loading...</p>
        ) : error ? (
          <p className="mt-3 text-xs text-[#ff004d]">{error}</p>
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
    </aside>
  );
}
