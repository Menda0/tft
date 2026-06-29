import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { FollowersCount } from "@/components/profile/followers-count";
import { profileKindUsesIdentity } from "@/lib/avatars/page-kind";
import { formatArchetypeLabel } from "@/lib/personalities/archetypes";
import { formatGenderLabel } from "@/lib/personalities/gender";
import { formatPronounLabel } from "@/lib/personalities/pronouns";
import type { AvatarStatus } from "@/lib/types/personality";
import { formatPoliticalSwingCategory, formatPoliticalSwingLabel } from "@/lib/personalities/political-swing";
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

export function ProfileHeader({ personality }: ProfileHeaderProps) {
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
          <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
            {formatArchetypeLabel(personality.archetype).toUpperCase()} ·{" "}
            {formatPoliticalSwingLabel(personality.politicalSwing).toUpperCase()}
          </p>
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

      <FollowersCount
        handle={personality.handle}
        count={personality.stats.followers}
      />
    </header>
  );
}
