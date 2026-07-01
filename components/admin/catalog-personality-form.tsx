"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCatalogPersonalityRequest } from "@/lib/admin/personality-catalog-client";
import {
  PAGE_KINDS,
  PAGE_KIND_LABELS,
  profileKindUsesIdentity,
  type PageKind,
} from "@/lib/avatars/page-kind";
import {
  coerceArchetypeForPageKind,
  getArchetypeOptionsForPageKind,
  pageKindUsesArchetype,
} from "@/lib/personalities/kind-archetypes";
import type { Archetype } from "@/lib/personalities/archetypes";
import { checkHandleAvailabilityRequest } from "@/lib/personalities/client";
import { slugifyHandle, validateHandle } from "@/lib/personalities/validation";
import { generateRandomPersonality } from "@/lib/personalities/random";
import {
  GENDERS,
  GENDER_LABELS,
  defaultPronounsForGender,
  type Gender,
} from "@/lib/personalities/gender";
import {
  PRONOUNS,
  PRONOUN_LABELS,
  type Pronouns,
} from "@/lib/personalities/pronouns";
import {
  POLITICAL_SWING_MAX,
  POLITICAL_SWING_MIN,
  formatPoliticalSwingLabel,
  type PoliticalSwing,
} from "@/lib/personalities/political-swing";
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

const DEFAULT_TRAITS: Traits = {
  humor: 5,
  aggression: 3,
  troll: 4,
  woke: 5,
  negacionist: 3,
  radical: 5,
};

type CatalogPersonalityFormProps = {
  onCreated?: () => void;
};

export function CatalogPersonalityForm({ onCreated }: CatalogPersonalityFormProps) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleManuallyEdited, setHandleManuallyEdited] = useState(false);
  const [gender, setGender] = useState<Gender>("male");
  const [pronouns, setPronouns] = useState<Pronouns>("he_him");
  const [kind, setKind] = useState<PageKind>("person");
  const [archetype, setArchetype] = useState<Archetype | null>("troll");
  const [politicalSwing, setPoliticalSwing] = useState<PoliticalSwing>(0);
  const [interests, setInterests] = useState("");
  const [traits, setTraits] = useState<Traits>(DEFAULT_TRAITS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!handle.trim()) {
      setHandleError(null);
      setHandleChecking(false);
      return () => {
        cancelled = true;
      };
    }

    const formatError = validateHandle(handle);

    if (formatError) {
      setHandleError(formatError);
      setHandleChecking(false);
      return () => {
        cancelled = true;
      };
    }

    setHandleError(null);
    setHandleChecking(true);

    const timer = window.setTimeout(() => {
      void checkHandleAvailabilityRequest(handle).then((result) => {
        if (cancelled) {
          return;
        }

        setHandleChecking(false);

        if (!result.ok) {
          setHandleError(result.error);
          return;
        }

        if (!result.available) {
          setHandleError(result.error ?? "Handle is already taken.");
          return;
        }

        setHandleError(null);
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [handle]);

  function updateName(value: string) {
    setName(value);

    if (!handleManuallyEdited) {
      setHandle(slugifyHandle(value));
    }
  }

  function updateHandle(value: string) {
    const suggested = slugifyHandle(name);
    setHandle(value);
    setHandleManuallyEdited(value !== suggested);
  }

  function updateTrait(key: keyof Traits, value: number) {
    setTraits((current) => ({ ...current, [key]: value }));
  }

  function updateGender(value: Gender) {
    setGender(value);
    setPronouns(defaultPronounsForGender(value));
  }

  function updateKind(value: PageKind) {
    setKind(value);
    setArchetype((current) => coerceArchetypeForPageKind(value, current));
  }

  function randomizeForm() {
    const draft = generateRandomPersonality();
    setName(draft.name);
    setHandle(draft.handle);
    setHandleManuallyEdited(true);
    setKind(draft.kind);
    if (profileKindUsesIdentity(draft.kind)) {
      setGender(draft.gender ?? "nonbinary");
      setPronouns(draft.pronouns ?? "they_them");
    }
    setArchetype(draft.archetype);
    setPoliticalSwing(draft.politicalSwing);
    setTraits(draft.traits);
    setInterests(draft.interests);
    setError(null);
    setHandleError(null);
  }

  const handleInputInvalid = Boolean(handleError);
  const canSubmit =
    !isSubmitting &&
    !handleChecking &&
    !handleInputInvalid &&
    handle.trim().length > 0 &&
    name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Log in as admin to create catalog personalities.");
      return;
    }

    setIsSubmitting(true);

    const result = await createCatalogPersonalityRequest(token, {
      name,
      handle,
      kind,
      ...(profileKindUsesIdentity(kind) ? { gender, pronouns } : {}),
      archetype,
      politicalSwing,
      traits,
      interests,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setHandle("");
    setHandleManuallyEdited(false);
    onCreated?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pixel-border space-y-4 bg-[#1d2b53] p-4"
    >
      <div>
        <p className="pixel-heading text-[10px] text-[#29adff]">CREATE</p>
        <p className="mt-1 text-sm text-[#83769a]">
          Catalog personalities have no owner and stay out of the game until
          imported after NFT transfer.
        </p>
      </div>

      <Button
        type="button"
        onClick={randomizeForm}
        className="rounded-none border-2 border-[#fff1e8] bg-[#ff004d] py-2 text-[#fff1e8] hover:bg-[#7e2553]"
      >
        Randomize
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="catalog-name" className="text-xs text-[#ffa300]">
            Name
          </Label>
          <Input
            id="catalog-name"
            value={name}
            onChange={(event) => updateName(event.target.value)}
            className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="catalog-handle" className="text-xs text-[#ffa300]">
            Handle
          </Label>
          <Input
            id="catalog-handle"
            value={handle}
            onChange={(event) => updateHandle(event.target.value)}
            aria-invalid={handleInputInvalid}
            className={cn(
              "rounded-none border-2 bg-[#29366f] text-[#fff1e8]",
              handleInputInvalid ? "border-[#ff004d]" : "border-[#fff1e8]",
            )}
          />
          {handleChecking ? (
            <p className="text-xs text-[#83769a]">Checking handle...</p>
          ) : handleError ? (
            <p className="text-xs text-[#ff004d]">{handleError}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="catalog-kind" className="text-xs text-[#ffa300]">
            Profile kind
          </Label>
          <select
            id="catalog-kind"
            value={kind}
            onChange={(event) => updateKind(event.target.value as PageKind)}
            className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8]"
          >
            {PAGE_KINDS.map((value) => (
              <option key={value} value={value}>
                {PAGE_KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {pageKindUsesArchetype(kind) ? (
          <div className="space-y-2">
            <Label htmlFor="catalog-archetype" className="text-xs text-[#ffa300]">
              Archetype
            </Label>
            <select
              id="catalog-archetype"
              value={archetype ?? ""}
              onChange={(event) =>
                setArchetype((event.target.value as Archetype) || null)
              }
              className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8]"
            >
              {getArchetypeOptionsForPageKind(kind).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {profileKindUsesIdentity(kind) ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="catalog-gender" className="text-xs text-[#ffa300]">
              Gender
            </Label>
            <select
              id="catalog-gender"
              value={gender}
              onChange={(event) => updateGender(event.target.value as Gender)}
              className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8]"
            >
              {GENDERS.map((value) => (
                <option key={value} value={value}>
                  {GENDER_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog-pronouns" className="text-xs text-[#ffa300]">
              Pronouns
            </Label>
            <select
              id="catalog-pronouns"
              value={pronouns}
              onChange={(event) =>
                setPronouns(event.target.value as Pronouns)
              }
              className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8]"
            >
              {PRONOUNS.map((value) => (
                <option key={value} value={value}>
                  {PRONOUN_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="catalog-interests" className="text-xs text-[#ffa300]">
          Interests (comma-separated)
        </Label>
        <Input
          id="catalog-interests"
          value={interests}
          onChange={(event) => setInterests(event.target.value)}
          className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-[#ffa300]">
          Political swing: {formatPoliticalSwingLabel(politicalSwing)}
        </Label>
        <input
          type="range"
          min={POLITICAL_SWING_MIN}
          max={POLITICAL_SWING_MAX}
          value={politicalSwing}
          onChange={(event) =>
            setPoliticalSwing(Number.parseInt(event.target.value, 10))
          }
          className="w-full"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRAIT_LABELS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-[#ffa300]">
              {label}: {traits[key]}
            </Label>
            <input
              type="range"
              min={0}
              max={10}
              value={traits[key]}
              onChange={(event) =>
                updateTrait(key, Number.parseInt(event.target.value, 10))
              }
              className="w-full"
            />
          </div>
        ))}
      </div>

      {error ? (
        <p className="pixel-border bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="rounded-none border-2 border-[#fff1e8] bg-[#00e436] py-2 text-[#1d2b53] hover:bg-[#29adff]"
      >
        {isSubmitting ? "Creating..." : "Create catalog personality"}
      </Button>
    </form>
  );
}
