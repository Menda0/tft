"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPersonalityRequest } from "@/lib/personalities/client";
import {
  ARCHETYPES,
  ARCHETYPE_LABELS,
  formatArchetypeLabel,
  type Archetype,
} from "@/lib/personalities/archetypes";
import { slugifyHandle } from "@/lib/personalities/validation";
import { generateRandomPersonality } from "@/lib/personalities/random";
import {
  GENDERS,
  GENDER_LABELS,
  formatGenderLabel,
  type Gender,
} from "@/lib/personalities/gender";
import type { Personality, Traits } from "@/lib/types/personality";

const GENDER_OPTIONS = GENDERS.map((value) => ({
  value,
  label: GENDER_LABELS[value],
}));

const ARCHETYPE_OPTIONS = ARCHETYPES.map((value) => ({
  value,
  label: ARCHETYPE_LABELS[value],
}));

const TRAIT_LABELS: { key: keyof Traits; label: string }[] = [
  { key: "humor", label: "Humor" },
  { key: "aggression", label: "Aggression" },
  { key: "charisma", label: "Charisma" },
  { key: "curiosity", label: "Curiosity" },
  { key: "chaos", label: "Chaos" },
  { key: "empathy", label: "Empathy" },
];

const DEFAULT_TRAITS: Traits = {
  humor: 5,
  aggression: 3,
  charisma: 5,
  curiosity: 5,
  chaos: 4,
  empathy: 5,
};

export function CreatePersonalityForm() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [gender, setGender] = useState<Gender>("nonbinary");
  const [archetype, setArchetype] = useState<Archetype>("comedian");
  const [interests, setInterests] = useState("");
  const [traits, setTraits] = useState<Traits>(DEFAULT_TRAITS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<Personality | null>(null);

  function updateName(value: string) {
    setName(value);

    if (!handleTouched) {
      setHandle(slugifyHandle(value));
    }
  }

  function updateTrait(key: keyof Traits, value: number) {
    setTraits((current) => ({ ...current, [key]: value }));
  }

  function randomizeForm() {
    const draft = generateRandomPersonality();
    setName(draft.name);
    setHandle(draft.handle);
    setHandleTouched(true);
    setGender(draft.gender);
    setArchetype(draft.archetype);
    setTraits(draft.traits);
    setInterests(draft.interests);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Log in from the menu to create a personality.");
      return;
    }

    setIsSubmitting(true);

    const result = await createPersonalityRequest(token, {
      name,
      handle,
      gender,
      archetype,
      traits,
      interests,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCreated(result.personality);
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

  if (created) {
    return (
      <>
        <AppBar title="Created" onBack={() => router.push("/")} />
        <div className="space-y-4 px-4 py-6">
          <div className="pixel-border bg-[#29366f] p-4 pixel-shadow-sm">
            <div className="mx-auto size-32 overflow-hidden pixel-border-thin bg-[#1d2b53]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={created.avatarUrl}
                alt={`${created.name} avatar`}
                className="size-full object-cover [image-rendering:pixelated]"
              />
            </div>
            <div className="mt-4 space-y-1 text-center">
              <p className="pixel-heading text-[10px] text-[#29adff]">
                {formatArchetypeLabel(created.archetype).toUpperCase()}
              </p>
              <p className="text-lg font-bold text-[#ffa300]">{created.name}</p>
              <p className="text-sm text-[#c2c3c7]">@{created.handle}</p>
              <p className="text-xs text-[#83769a]">
                {formatGenderLabel(created.gender)}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#c2c3c7]">
            Pixel avatar generated and saved to MongoDB.
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 rounded-none border-2 border-[#fff1e8] bg-[#00e436] text-[#1d2b53] hover:bg-[#29adff]"
            >
              View feed
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCreated(null);
                setName("");
                setHandle("");
                setHandleTouched(false);
                setGender("nonbinary");
                setInterests("");
                setTraits(DEFAULT_TRAITS);
                setArchetype("comedian");
              }}
              className="flex-1 rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] hover:bg-[#83769a]"
            >
              Create another
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="New Bot" onBack={() => router.push("/")} />
      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4 pb-8">
        <p className="text-sm text-[#c2c3c7]">
          Build a FakeX personality. OpenAI will generate a pixel art avatar
          from the profile you define.
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="handle" className="text-xs text-[#ffa300]">
            Handle
          </Label>
          <Input
            id="handle"
            value={handle}
            onChange={(event) => {
              setHandleTouched(true);
              setHandle(event.target.value);
            }}
            placeholder="bitbot_comedian"
            autoComplete="off"
            className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] text-[#fff1e8] placeholder:text-[#83769a] focus-visible:border-[#29adff] focus-visible:ring-0"
          />
          <p className="text-xs text-[#83769a]">
            Letters, numbers, and underscores only.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender" className="text-xs text-[#ffa300]">
            Gender
          </Label>
          <select
            id="gender"
            value={gender}
            onChange={(event) => setGender(event.target.value as Gender)}
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
          <Label htmlFor="archetype" className="text-xs text-[#ffa300]">
            Archetype
          </Label>
          <select
            id="archetype"
            value={archetype}
            onChange={(event) => setArchetype(event.target.value as Archetype)}
            className="h-10 w-full pixel-border-thin bg-[#29366f] px-3 text-[#fff1e8] outline-none focus:border-[#29adff]"
          >
            {ARCHETYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-none border-2 border-[#fff1e8] bg-[#00e436] py-3 text-[#1d2b53] hover:bg-[#29adff] disabled:opacity-60"
        >
          {isSubmitting ? "Generating pixel avatar..." : "Create personality"}
        </Button>
      </form>
    </>
  );
}
