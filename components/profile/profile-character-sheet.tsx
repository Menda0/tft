"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import {
  fetchProfileCharacterMemories,
  fetchProfileCharacterRelationships,
  PROFILE_CHARACTER_SECTION_PAGE_SIZE,
} from "@/lib/profile/client";
import type { MemoryItem, MemoryType, Traits } from "@/lib/types/personality";
import type {
  ProfileCharacterSheet,
  ProfileRelationship,
} from "@/lib/types/profile";
import { cn } from "@/lib/utils";

const TRAIT_LABELS: { key: keyof Traits; label: string }[] = [
  { key: "humor", label: "Humor" },
  { key: "aggression", label: "Aggression" },
  { key: "troll", label: "Troll" },
  { key: "woke", label: "Woke" },
  { key: "negacionist", label: "Negacionist" },
  { key: "radical", label: "Radical" },
];

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  friendship: "FRIEND",
  rivalry: "RIVAL",
  scandal: "SCANDAL",
  milestone: "MILESTONE",
  belief_change: "SHIFT",
};

const RELATIONSHIP_FIELDS: {
  key: keyof Pick<
    ProfileRelationship,
    "trust" | "rivalry" | "admiration" | "familiarity"
  >;
  label: string;
  color: string;
}[] = [
  { key: "trust", label: "Trust", color: "bg-[#00e756]" },
  { key: "rivalry", label: "Rivalry", color: "bg-[#ff004d]" },
  { key: "admiration", label: "Admiration", color: "bg-[#ffa300]" },
  { key: "familiarity", label: "Familiarity", color: "bg-[#29adff]" },
];

type ProfileCharacterSheetProps = {
  handle: string;
  character: ProfileCharacterSheet;
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-foreground bg-[#1d2b53] p-3">
      <p className="pixel-heading text-[8px] text-[#83769a]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#ffa300]">
        {value.toLocaleString()}
      </p>
    </div>
  );
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
        <div
          className="h-full bg-[#ffa300]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function RelationshipBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const percent = Math.min(100, Math.max(0, value * 10));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-[#83769a]">{label}</span>
        <span className="text-[#c2c3c7]">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 border border-foreground bg-[#1d2b53]">
        <div className={cn("h-full", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MemoryBadge({ type }: { type: MemoryType }) {
  return (
    <span className="pixel-heading text-[7px] text-[#29adff]">
      {MEMORY_TYPE_LABELS[type]}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pixel-heading text-[9px] text-[#ffa300]">{children}</h3>
  );
}

function SectionPagination({
  page,
  hasPrevious,
  hasNext,
  loading,
  onPrevious,
  onNext,
}: {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
        className={cn(
          "pixel-heading border-2 border-foreground px-3 py-2 text-[8px] transition-colors",
          hasPrevious && !loading
            ? "bg-[#1d2b53] text-[#ffa300] hover:bg-[#29366f]"
            : "cursor-not-allowed bg-[#1d2b53]/50 text-[#83769a]",
        )}
      >
        PREVIOUS
      </button>
      <span className="pixel-heading text-[8px] text-[#83769a]">
        PAGE {page + 1}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext || loading}
        className={cn(
          "pixel-heading border-2 border-foreground px-3 py-2 text-[8px] transition-colors",
          hasNext && !loading
            ? "bg-[#1d2b53] text-[#ffa300] hover:bg-[#29366f]"
            : "cursor-not-allowed bg-[#1d2b53]/50 text-[#83769a]",
        )}
      >
        NEXT
      </button>
    </div>
  );
}

export function ProfileCharacterSheetView({
  handle,
  character,
}: ProfileCharacterSheetProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [relationships, setRelationships] = useState<ProfileRelationship[]>([]);
  const [memoriesPage, setMemoriesPage] = useState(0);
  const [relationshipsPage, setRelationshipsPage] = useState(0);
  const [memoriesHasNext, setMemoriesHasNext] = useState(false);
  const [relationshipsHasNext, setRelationshipsHasNext] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [loadingRelationships, setLoadingRelationships] = useState(true);
  const [memoriesError, setMemoriesError] = useState<string | null>(null);
  const [relationshipsError, setRelationshipsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setMemoriesPage(0);
  }, [handle]);

  useEffect(() => {
    setRelationshipsPage(0);
  }, [handle]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingMemories(true);
      setMemoriesError(null);

      const result = await fetchProfileCharacterMemories(handle, {
        offset: memoriesPage * PROFILE_CHARACTER_SECTION_PAGE_SIZE,
      });

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setMemoriesError(result.error);
        setMemories([]);
        setMemoriesHasNext(false);
        setLoadingMemories(false);
        return;
      }

      setMemories(result.items);
      setMemoriesHasNext(result.hasMore);
      setLoadingMemories(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [handle, memoriesPage]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingRelationships(true);
      setRelationshipsError(null);

      const result = await fetchProfileCharacterRelationships(handle, {
        offset: relationshipsPage * PROFILE_CHARACTER_SECTION_PAGE_SIZE,
      });

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setRelationshipsError(result.error);
        setRelationships([]);
        setRelationshipsHasNext(false);
        setLoadingRelationships(false);
        return;
      }

      setRelationships(result.items);
      setRelationshipsHasNext(result.hasMore);
      setLoadingRelationships(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [handle, relationshipsPage]);

  const showMemoriesPagination = memoriesPage > 0 || memoriesHasNext;
  const showRelationshipsPagination =
    relationshipsPage > 0 || relationshipsHasNext;

  return (
    <div className="space-y-6 px-4 py-4">
      <section>
        <SectionTitle>STATS</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="FOLLOWERS" value={character.stats.followers} />
          <StatCard label="REPUTATION" value={character.stats.reputation} />
          <StatCard label="CONTROVERSY" value={character.stats.controversy} />
          <StatCard label="CREATIVITY" value={character.stats.creativity} />
        </div>
      </section>

      <section>
        <SectionTitle>TRAITS</SectionTitle>
        <div className="mt-3 space-y-3">
          {TRAIT_LABELS.map(({ key, label }) => (
            <TraitBar
              key={key}
              label={label}
              value={character.traits[key]}
            />
          ))}
        </div>
        {character.interests.length > 0 ? (
          <p className="mt-4 text-xs leading-relaxed text-[#83769a]">
            Interests:{" "}
            <span className="text-[#c2c3c7]">
              {character.interests.join(", ")}
            </span>
          </p>
        ) : null}
      </section>

      <section>
        <SectionTitle>EVOLUTION</SectionTitle>
        {character.evolutions.length === 0 ? (
          <p className="mt-3 text-sm text-[#83769a]">No evolution yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {character.evolutions.map((memory, index) => (
              <li
                key={`${memory.type}-${index}`}
                className="border-2 border-foreground bg-[#1d2b53] p-3"
              >
                <MemoryBadge type={memory.type} />
                <p className="mt-2 text-sm leading-relaxed text-[#c2c3c7]">
                  {memory.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>MEMORIES</SectionTitle>
        {loadingMemories ? (
          <p className="mt-3 text-sm text-[#83769a]">Loading memories...</p>
        ) : memoriesError ? (
          <p className="mt-3 text-sm text-[#ff004d]">{memoriesError}</p>
        ) : memories.length === 0 ? (
          <p className="mt-3 text-sm text-[#83769a]">No memories yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {memories.map((memory, index) => (
              <li
                key={`${memory.type}-${memory.text}-${index}`}
                className="border-2 border-foreground bg-[#1d2b53] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <MemoryBadge type={memory.type} />
                  <span className="text-[10px] text-[#83769a]">
                    importance {memory.importance}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#c2c3c7]">
                  {memory.text}
                </p>
              </li>
            ))}
          </ul>
        )}
        {showMemoriesPagination ? (
          <SectionPagination
            page={memoriesPage}
            hasPrevious={memoriesPage > 0}
            hasNext={memoriesHasNext}
            loading={loadingMemories}
            onPrevious={() => setMemoriesPage((page) => Math.max(0, page - 1))}
            onNext={() => setMemoriesPage((page) => page + 1)}
          />
        ) : null}
      </section>

      <section>
        <SectionTitle>RELATIONSHIPS</SectionTitle>
        {loadingRelationships ? (
          <p className="mt-3 text-sm text-[#83769a]">
            Loading relationships...
          </p>
        ) : relationshipsError ? (
          <p className="mt-3 text-sm text-[#ff004d]">{relationshipsError}</p>
        ) : relationships.length === 0 ? (
          <p className="mt-3 text-sm text-[#83769a]">No relationships yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {relationships.map((relationship) => (
              <li
                key={relationship.personalityId}
                className="border-2 border-foreground bg-[#1d2b53] p-3"
              >
                <Link
                  href={`/u/${relationship.handle}`}
                  className="flex items-center gap-3 hover:opacity-90"
                >
                  <PersonalityAvatar
                    personality={{
                      name: relationship.name,
                      handle: relationship.handle,
                      avatarUrl: relationship.avatarUrl,
                      avatarStatus: relationship.avatarUrl ? "ready" : "pending",
                    }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#ffa300]">
                      {relationship.name}
                    </p>
                    <p className="truncate text-xs text-[#83769a]">
                      @{relationship.handle}
                    </p>
                  </div>
                </Link>
                <div className="mt-3 space-y-2">
                  {RELATIONSHIP_FIELDS.map(({ key, label, color }) => (
                    <RelationshipBar
                      key={key}
                      label={label}
                      value={relationship[key]}
                      color={color}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        {showRelationshipsPagination ? (
          <SectionPagination
            page={relationshipsPage}
            hasPrevious={relationshipsPage > 0}
            hasNext={relationshipsHasNext}
            loading={loadingRelationships}
            onPrevious={() =>
              setRelationshipsPage((page) => Math.max(0, page - 1))
            }
            onNext={() => setRelationshipsPage((page) => page + 1)}
          />
        ) : null}
      </section>
    </div>
  );
}
