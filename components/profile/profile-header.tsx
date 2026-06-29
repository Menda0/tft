import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { FollowersCount } from "@/components/profile/followers-count";
import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import { formatArchetypeLabel } from "@/lib/personalities/archetypes";
import { formatGenderLabel } from "@/lib/personalities/gender";
import { formatPronounLabel } from "@/lib/personalities/pronouns";
import type { AvatarStatus } from "@/lib/types/personality";
import { formatPoliticalSwingCategory, formatPoliticalSwingLabel } from "@/lib/personalities/political-swing";
import { formatStatValue, normalizeStoredStats } from "@/lib/personalities/stats";
import type { PublicPersonality } from "@/lib/types/profile";

type ProfileHeaderProps = {
  personality: PublicPersonality;
};

function toAvatarSource(personality: PublicPersonality) {
  return {
    name: personality.name,
    handle: personality.handle,
    avatarUrl: personality.avatarUrl,
    avatarStatus: (personality.avatarUrl ? "ready" : "pending") as AvatarStatus,
  };
}

function ProfileStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1">
      <p className="pixel-heading text-[8px] text-[#83769a]">{label}</p>
      <p className={`truncate text-sm font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function ProfileHeader({ personality }: ProfileHeaderProps) {
  const stats = normalizeStoredStats(personality.stats);

  return (
    <header className="px-4 py-4">
      <div className="flex gap-4">
        <PersonalityAvatar personality={toAvatarSource(personality)} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="truncate text-lg font-bold text-[#ffa300]">
            {personality.name}
          </h2>
          <p className="truncate text-sm text-[#c2c3c7]">
            @{personality.handle}
          </p>
          {profileKindUsesIdentity(personality.kind) ? (
            <p className="mt-1 text-xs text-[#83769a]">
              {formatGenderLabel(personality.gender)} ·{" "}
              {formatPronounLabel(personality.pronouns)}
            </p>
          ) : null}
          {personality.archetype ? (
            <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
              {formatArchetypeLabel(personality.archetype).toUpperCase()} ·{" "}
              {formatPoliticalSwingLabel(personality.politicalSwing).toUpperCase()}
            </p>
          ) : (
            <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
              {formatPoliticalSwingLabel(personality.politicalSwing).toUpperCase()}
            </p>
          )}
          <p className="mt-1 text-[10px] text-[#83769a]">
            {formatPoliticalSwingCategory(personality.politicalSwing)}
          </p>
        </div>
      </div>

      {personality.description ? (
        <p className="mt-4 text-sm leading-relaxed text-[#c2c3c7]">
          {personality.description}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-4 items-start justify-items-center gap-2 border-y-2 border-foreground py-3">
        <div className="flex min-w-0 flex-col items-center gap-1 px-1">
          <p className="pixel-heading text-[8px] text-[#83769a]">FOLLOWERS</p>
          <FollowersCount
            handle={personality.handle}
            count={stats.followers}
            showLabel={false}
            className="text-sm text-[#83769a] transition-colors hover:text-[#c2c3c7]"
          />
        </div>
        <ProfileStat
          label="CLOUT"
          value={formatStatValue(stats.socialScore)}
          valueClassName="text-[#ffa300]"
        />
        <ProfileStat
          label="HEAT"
          value={formatStatValue(stats.controversy)}
          valueClassName="text-[#ff004d]"
        />
        <ProfileStat
          label="RANK"
          value={(personality.socialRankLabel ?? "Novice").toUpperCase()}
          valueClassName="text-[#29adff] pixel-heading text-[8px] pt-0.5"
        />
      </div>
    </header>
  );
}
