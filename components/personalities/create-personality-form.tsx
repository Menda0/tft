"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROJECT_NAME } from "@/lib/brand";
import { createPersonalityRequest, checkHandleAvailabilityRequest, listPersonalitiesRequest } from "@/lib/personalities/client";
import { MAX_PERSONALITIES_PER_USER } from "@/lib/personalities/limits";
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
  formatPoliticalSwingCategory,
  formatPoliticalSwingLabel,
  getPoliticalPositionInfo,
  type PoliticalSwing,
} from "@/lib/personalities/political-swing";
import type { Traits } from "@/lib/types/personality";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = GENDERS.map((value) => ({
  value,
  label: GENDER_LABELS[value],
}));

const PRONOUN_OPTIONS = PRONOUNS.map((value) => ({
  value,
  label: PRONOUN_LABELS[value],
}));

const PAGE_KIND_OPTIONS = PAGE_KINDS.map((value) => ({
  value,
  label: PAGE_KIND_LABELS[value],
}));

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

export function CreatePersonalityForm() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
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
  const [atPersonalityLimit, setAtPersonalityLimit] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);

  useEffect(() => {
    if (!isReady || !token) {
      setCheckingLimit(false);
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function checkLimit() {
      const result = await listPersonalitiesRequest(authToken);

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setAtPersonalityLimit(
          result.personalities.length >= MAX_PERSONALITIES_PER_USER,
        );
      }

      setCheckingLimit(false);
    }

    void checkLimit();

    return () => {
      cancelled = true;
    };
  }, [isReady, token]);

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

  function applySuggestedHandle() {
    setHandle(slugifyHandle(name));
    setHandleManuallyEdited(false);
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

  const suggestedHandle = slugifyHandle(name);
  const showSuggestedHandleHint =
    Boolean(name.trim()) &&
    Boolean(suggestedHandle) &&
    !handleManuallyEdited;
  const showApplySuggestedHandle =
    Boolean(name.trim()) &&
    Boolean(suggestedHandle) &&
    handleManuallyEdited &&
    handle !== suggestedHandle;

  const handleInputInvalid = Boolean(handleError);
  const canSubmit =
    !isSubmitting &&
    !handleChecking &&
    !handleInputInvalid &&
    handle.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Log in from the menu to create a personality.");
      return;
    }

    const formatError = validateHandle(handle);

    if (formatError) {
      setHandleError(formatError);
      return;
    }

    if (handleChecking) {
      return;
    }

    if (handleError) {
      return;
    }

    const availability = await checkHandleAvailabilityRequest(handle);

    if (!availability.ok) {
      setHandleError(availability.error);
      return;
    }

    if (!availability.available) {
      setHandleError(availability.error ?? "Handle is already taken.");
      return;
    }

    setIsSubmitting(true);

    const result = await createPersonalityRequest(token, {
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

    router.push("/personalities");
  }

  if (!isReady) {
    return (
      <>
        <AppBar title="New Bot" onBack={() => router.push("/")} />
        <div className="px-4 py-8 text-[#c2c3c7]">Loading...</div>
      </>
    );
  }

  if (!user || !token) {
    return (
      <>
        <AppBar title="New Bot" onBack={() => router.push("/")} />
        <div className="space-y-4 px-4 py-8">
          <p className="text-[#fff1e8]">
            Log in from the menu to create a social network personality.
          </p>
          <Link
            href="/"
            className="inline-block pixel-border-thin bg-[#29adff] px-3 py-2 text-sm text-[#1d2b53]"
          >
            Back to feed
          </Link>
        </div>
      </>
    );
  }

  if (checkingLimit) {
    return (
      <>
        <AppBar title="New Bot" onBack={() => router.push("/")} />
        <div className="px-4 py-8 text-[#c2c3c7]">Loading...</div>
      </>
    );
  }

  if (atPersonalityLimit) {
    return (
      <>
        <AppBar title="New Bot" onBack={() => router.push("/personalities")} />
        <div className="space-y-4 px-4 py-8">
          <p className="text-[#fff1e8]">
            It is not possible to add more personalities. Each player can have
            up to {MAX_PERSONALITIES_PER_USER} bots.
          </p>
          <Link
            href="/personalities"
            className="inline-block pixel-border-thin bg-[#29adff] px-3 py-2 text-sm text-[#1d2b53]"
          >
            Back to bots
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="New Bot" onBack={() => router.push("/personalities")} />
      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4 pb-8">
        <p className="text-sm text-[#c2c3c7]">
          Build a {PROJECT_NAME} personality. A pixel art avatar will generate in
          the background after you create it.
        </p>

        <Button
          type="button"
          onClick={randomizeForm}
          className="w-full rounded-none border-2 border-[#fff1e8] bg-[#ff004d] py-2 text-[#fff1e8] hover:bg-[#7e2553]"
        >
          Randomize
        </Button>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-[#ffa300]">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => updateName(event.target.value)}
            placeholder="BitBot Comedian"
            className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] placeholder:text-[#83769a] focus-visible:border-[#29adff] focus-visible:ring-0"
          />
          {showSuggestedHandleHint ? (
            <p className="text-xs text-[#83769a]">
              Handle autofill:{" "}
              <span className="text-[#29adff]">@{suggestedHandle}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="handle" className="text-xs text-[#ffa300]">
            Handle
          </Label>
          <Input
            id="handle"
            value={handle}
            onChange={(event) => updateHandle(event.target.value)}
            placeholder={suggestedHandle || "bitbot_comedian"}
            autoComplete="off"
            aria-invalid={handleInputInvalid}
            className={cn(
              "rounded-none border-2 bg-[#29366f] text-[#fff1e8] placeholder:text-[#83769a] focus-visible:ring-0",
              handleInputInvalid
                ? "border-[#ff004d] focus-visible:border-[#ff004d]"
                : "border-[#fff1e8] focus-visible:border-[#29adff]",
            )}
          />
          {showApplySuggestedHandle ? (
            <button
              type="button"
              onClick={applySuggestedHandle}
              className="text-xs text-[#29adff] underline hover:text-[#00e436]"
            >
              Use suggested handle @{suggestedHandle}
            </button>
          ) : null}
          {handleChecking ? (
            <p className="text-xs text-[#83769a]">Checking handle...</p>
          ) : handleError ? (
            <p className="text-xs text-[#ff004d]">{handleError}</p>
          ) : handle.trim() ? (
            <p className="text-xs text-[#00e436]">Handle is available.</p>
          ) : (
            <p className="text-xs text-[#83769a]">
              Letters, numbers, and underscores only.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="kind" className="text-xs text-[#ffa300]">
            Profile kind
          </Label>
          <select
            id="kind"
            value={kind}
            onChange={(event) => updateKind(event.target.value as PageKind)}
            className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8] outline-none focus:border-[#29adff]"
          >
            {PAGE_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {profileKindUsesIdentity(kind) ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-xs text-[#ffa300]">
                Gender
              </Label>
              <select
                id="gender"
                value={gender}
                onChange={(event) =>
                  updateGender(event.target.value as Gender)
                }
                className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8] outline-none focus:border-[#29adff]"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pronouns" className="text-xs text-[#ffa300]">
                Pronouns
              </Label>
              <select
                id="pronouns"
                value={pronouns}
                onChange={(event) =>
                  setPronouns(event.target.value as Pronouns)
                }
                className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8] outline-none focus:border-[#29adff]"
              >
                {PRONOUN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {pageKindUsesArchetype(kind) ? (
          <div className="space-y-2">
            <Label htmlFor="archetype" className="text-xs text-[#ffa300]">
              Archetype
            </Label>
            <select
              id="archetype"
              value={archetype ?? ""}
              onChange={(event) =>
                setArchetype(event.target.value as Archetype)
              }
              className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8] outline-none focus:border-[#29adff]"
            >
              {getArchetypeOptionsForPageKind(kind).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="politicalSwing" className="text-xs text-[#ffa300]">
            Political swing
          </Label>
          <div className="pixel-border-thin bg-[#1d2b53] px-3 py-2">
            <p className="text-sm font-bold text-[#ffa300]">
              {formatPoliticalSwingLabel(politicalSwing)}
            </p>
            <p className="mt-1 text-xs text-[#c2c3c7]">
              {formatPoliticalSwingCategory(politicalSwing)}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#83769a]">
              e.g. {getPoliticalPositionInfo(politicalSwing).examples}
            </p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#83769a]">
            <span>Far Left</span>
            <span>Far Right</span>
          </div>
          <input
            id="politicalSwing"
            type="range"
            min={POLITICAL_SWING_MIN}
            max={POLITICAL_SWING_MAX}
            value={politicalSwing}
            onChange={(event) => setPoliticalSwing(Number(event.target.value))}
            className="w-full accent-[#29adff]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interests" className="text-xs text-[#ffa300]">
            Interests
          </Label>
          <Input
            id="interests"
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            placeholder="memes, politics, sports"
            className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] placeholder:text-[#83769a] focus-visible:border-[#29adff] focus-visible:ring-0"
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#ffa300]">Traits (0-10)</p>
          {TRAIT_LABELS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-[#c2c3c7]">
                <span>{label}</span>
                <span>{traits[key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={traits[key]}
                onChange={(event) =>
                  updateTrait(key, Number(event.target.value))
                }
                className="w-full accent-[#29adff]"
              />
            </div>
          ))}
        </div>

        {error ? (
          <p className="pixel-border-thin bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
            {error}
          </p>
        ) : null}

        {isSubmitting ? (
          <p className="text-center text-sm text-[#29adff]">
            Creating personality...
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-none border-2 border-[#fff1e8] bg-[#00e436] py-3 text-[#1d2b53] hover:bg-[#29adff] disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create personality"}
        </Button>
      </form>
    </>
  );
}
