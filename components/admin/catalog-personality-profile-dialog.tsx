"use client";

import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PAGE_KIND_LABELS,
  profileKindUsesIdentity,
} from "@/lib/avatars/page-kind";
import type { CatalogPersonalityListItem } from "@/lib/admin/personality-catalog-client";
import { formatArchetypeLabel } from "@/lib/personalities/archetypes";
import { formatGenderLabel } from "@/lib/personalities/gender";
import {
  formatPoliticalSwingCategory,
  formatPoliticalSwingLabel,
} from "@/lib/personalities/political-swing";
import { formatPronounLabel } from "@/lib/personalities/pronouns";
import type { Traits } from "@/lib/types/personality";
import { cn } from "@/lib/utils";

const TRAIT_LABELS: { key: keyof Traits; label: string }[] = [
  { key: "humor", label: "Humor" },
  { key: "aggression", label: "Aggression" },
  { key: "troll", label: "Troll" },
  { key: "woke", label: "Woke" },
  { key: "negacionist", label: "Negacionist" },
  { key: "radical", label: "Radical" },
];

function statusColor(status: string): string {
  if (status === "ready") {
    return "text-[#00e436]";
  }

  if (status === "failed") {
    return "text-[#ff004d]";
  }

  return "text-[#ffa300]";
}

function TraitBar({ label, value }: { label: string; value: number }) {
  const percent = Math.min(100, Math.max(0, value * 10));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[#c2c3c7]">{label}</span>
        <span className="text-[#83769a]">{value}/10</span>
      </div>
      <div className="h-2 border border-foreground bg-[#1d2b53]">
        <div className="h-full bg-[#ffa300]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

type CatalogPersonalityProfileDialogProps = {
  item: CatalogPersonalityListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CatalogPersonalityProfileDialog({
  item,
  open,
  onOpenChange,
}: CatalogPersonalityProfileDialogProps) {
  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-lg overflow-y-auto rounded-none border-[3px] border-[#fff1e8] bg-[#1d2b53] p-0 text-[#fff1e8] shadow-none"
        showCloseButton
      >
        <DialogHeader className="gap-3 border-b-[3px] border-[#fff1e8] bg-[#29366f] px-4 py-4">
          <DialogTitle className="pixel-heading text-[11px] text-[#ffa300] uppercase">
            Personality profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-4 py-4">
          <div className="flex gap-4">
            <PersonalityAvatar
              personality={{
                name: item.name,
                handle: item.handle,
                avatarUrl: item.avatarUrl,
                avatarStatus: item.avatarStatus,
              }}
              size="lg"
            />
            <div className="min-w-0 flex-1 pt-1">
              <h2 className="truncate text-lg font-bold text-[#ffa300]">
                {item.name}
              </h2>
              <p className="truncate text-sm text-[#c2c3c7]">@{item.handle}</p>
              <p className="mt-1 pixel-heading text-[8px] text-[#83769a]">
                {PAGE_KIND_LABELS[item.kind].toUpperCase()}
              </p>
              {profileKindUsesIdentity(item.kind) ? (
                <p className="mt-1 text-xs text-[#83769a]">
                  {formatGenderLabel(item.gender)} ·{" "}
                  {formatPronounLabel(item.pronouns)}
                </p>
              ) : null}
              {item.archetype ? (
                <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
                  {formatArchetypeLabel(item.archetype).toUpperCase()} ·{" "}
                  {formatPoliticalSwingLabel(item.politicalSwing).toUpperCase()}
                </p>
              ) : (
                <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
                  {formatPoliticalSwingLabel(item.politicalSwing).toUpperCase()}
                </p>
              )}
              <p className="mt-1 text-[10px] text-[#83769a]">
                {formatPoliticalSwingCategory(item.politicalSwing)}
              </p>
            </div>
          </div>

          <section>
            <h3 className="pixel-heading text-[9px] text-[#ffa300]">BIO</h3>
            {item.description ? (
              <p className="mt-2 text-sm leading-relaxed text-[#c2c3c7]">
                {item.description}
              </p>
            ) : (
              <p className={cn("mt-2 text-sm", statusColor(item.descriptionStatus))}>
                Bio {item.descriptionStatus}
              </p>
            )}
          </section>

          <section>
            <h3 className="pixel-heading text-[9px] text-[#ffa300]">TRAITS</h3>
            <div className="mt-3 space-y-3">
              {TRAIT_LABELS.map(({ key, label }) => (
                <TraitBar key={key} label={label} value={item.traits[key]} />
              ))}
            </div>
            {item.interests.length > 0 ? (
              <p className="mt-4 text-xs leading-relaxed text-[#83769a]">
                Interests:{" "}
                <span className="text-[#c2c3c7]">
                  {item.interests.join(", ")}
                </span>
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="pixel-border-thin bg-[#29366f] p-2">
              <p className="pixel-heading text-[7px] text-[#83769a]">AVATAR</p>
              <p className={cn("mt-1 font-bold", statusColor(item.avatarStatus))}>
                {item.avatarStatus.toUpperCase()}
              </p>
            </div>
            <div className="pixel-border-thin bg-[#29366f] p-2">
              <p className="pixel-heading text-[7px] text-[#83769a]">MINT</p>
              <p className="mt-1 font-bold text-[#fff1e8]">
                {item.nft ? `Token #${item.nft.tokenId}` : "Unminted"}
              </p>
            </div>
          </section>

          {item.openSeaUrl ? (
            <p className="text-xs">
              <a
                href={item.openSeaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#29adff] underline hover:text-[#ffa300]"
              >
                View on OpenSea
              </a>
            </p>
          ) : null}

          <p className="text-[10px] text-[#83769a]">
            Catalog only — excluded from the game until imported via NFT.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
