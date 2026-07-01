"use client";

import { Check } from "lucide-react";

import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import { formatArchetypeLabel } from "@/lib/personalities/archetypes";
import { formatGenderLabel } from "@/lib/personalities/gender";
import { formatPronounLabel } from "@/lib/personalities/pronouns";
import {
  formatStatValue,
  normalizeStoredStats,
  normalizeStoredStatsRaw,
} from "@/lib/personalities/stats";
import type { PersonalityListItem } from "@/lib/profile/social-rank";
import { getCloutBreakdown } from "@/lib/scoring/social-score";

function isAvatarInProgress(personality: PersonalityListItem): boolean {
  return (
    personality.avatarStatus === "pending" ||
    personality.avatarStatus === "generating"
  );
}

function isDescriptionInProgress(personality: PersonalityListItem): boolean {
  return (
    personality.descriptionStatus === "pending" ||
    personality.descriptionStatus === "generating"
  );
}

function PersonalityCardStats({ personality }: { personality: PersonalityListItem }) {
  const rawStats = normalizeStoredStatsRaw(personality.stats);
  const stats = normalizeStoredStats(personality.stats);
  const clout = getCloutBreakdown(rawStats.socialScore, rawStats.controversy);
  const cloutTooltip = `Gross ${formatStatValue(clout.gross)} − heat tax ${formatStatValue(clout.penalty)}`;

  return (
    <div className="mt-2 grid grid-cols-4 items-end justify-items-center gap-1 border-t border-[#1d2b53] pt-2">
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-0.5">
        <p className="pixel-heading text-[7px] text-[#83769a]">FOLLOWERS</p>
        <p className="text-xs font-bold text-[#fff1e8]">
          {formatStatValue(stats.followers)}
        </p>
      </div>
      <div
        className="flex min-w-0 flex-col items-center gap-0.5 px-0.5"
        title={cloutTooltip}
      >
        <p className="pixel-heading text-[7px] text-[#83769a]">CLOUT</p>
        <p className="text-xs font-bold text-[#ffa300]">
          {formatStatValue(stats.socialScore)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-0.5">
        <p className="pixel-heading text-[7px] text-[#83769a]">HEAT</p>
        <p className="text-xs font-bold text-[#ff004d]">
          {formatStatValue(stats.controversy)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-0.5">
        <p className="pixel-heading text-[7px] text-[#83769a]">RANK</p>
        <p className="text-xs font-bold text-[#29adff]">
          {(personality.socialRankLabel ?? "Novice").toUpperCase()}
        </p>
      </div>
    </div>
  );
}

type PersonalityListCardProps = {
  personality: PersonalityListItem;
  onRetryDescription?: () => void;
  onRetryAvatar?: () => void;
};

export function PersonalityListCard({
  personality,
  onRetryDescription,
  onRetryAvatar,
}: PersonalityListCardProps) {
  const isMinted = Boolean(personality.nft);

  return (
    <li className="relative flex gap-3 pixel-border-thin bg-[#29366f] p-3">
      {isMinted ? (
        <span className="absolute right-2 top-2 flex items-center gap-1 border border-[#00e756] bg-[#1d2b53] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[#00e756]">
          <Check className="size-2.5 shrink-0" strokeWidth={3} />
          Minted
        </span>
      ) : null}
      <ProfileLink handle={personality.handle} className="shrink-0 hover:no-underline">
        <PersonalityAvatar personality={personality} size="md" />
      </ProfileLink>
      <div className={isMinted ? "min-w-0 flex-1 pr-14" : "min-w-0 flex-1"}>
        <p className="truncate font-bold text-[#ffa300]">
          <ProfileLink handle={personality.handle}>{personality.name}</ProfileLink>
        </p>
        <p className="truncate text-sm text-[#c2c3c7]">
          <ProfileLink handle={personality.handle}>@{personality.handle}</ProfileLink>
        </p>
        {profileKindUsesIdentity(personality.kind) ? (
          <p className="mt-1 text-xs text-[#83769a]">
            {formatGenderLabel(personality.gender)} ·{" "}
            {formatPronounLabel(personality.pronouns)}
          </p>
        ) : null}
        {personality.archetype ? (
          <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
            {formatArchetypeLabel(personality.archetype).toUpperCase()}
          </p>
        ) : null}
        {personality.description ? (
          <p className="mt-2 text-xs leading-relaxed text-[#c2c3c7]">
            {personality.description}
          </p>
        ) : null}
        <PersonalityCardStats personality={personality} />
        {isDescriptionInProgress(personality) ? (
          <p className="mt-1 text-xs text-[#83769a]">Writing profile bio...</p>
        ) : null}
        {personality.descriptionStatus === "failed" && onRetryDescription ? (
          <button
            type="button"
            onClick={onRetryDescription}
            className="mt-1 text-xs text-[#ff004d] underline"
          >
            Retry bio generation
          </button>
        ) : null}
        {isAvatarInProgress(personality) ? (
          <p className="mt-1 text-xs text-[#83769a]">Generating pixel avatar...</p>
        ) : null}
        {personality.avatarStatus === "failed" && onRetryAvatar ? (
          <button
            type="button"
            onClick={onRetryAvatar}
            className="mt-1 text-xs text-[#ff004d] underline"
          >
            Retry avatar generation
          </button>
        ) : null}
      </div>
    </li>
  );
}
