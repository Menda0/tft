import { readFile } from "fs/promises";
import path from "path";

import { isPageKind, type PageKind } from "@/lib/avatars/page-kind";
import { normalizeArchetype } from "@/lib/personalities/archetypes";
import {
  coerceArchetypeForPageKind,
  isArchetypeAllowedForPageKind,
  pageKindUsesArchetype,
} from "@/lib/personalities/kind-archetypes";
import { normalizeHandle, validateHandle } from "@/lib/personalities/validation";
import type { SocialRank } from "@/lib/scoring/ranks";
import type { Archetype } from "@/lib/types/personality";

export type RankNpcRemoveBehavior = "deactivate" | "delete";

export type RankNpcConfigEntry = {
  xHandle: string;
  realName: string;
  name: string;
  handle: string;
  fixedSocialRank: SocialRank;
  kind: PageKind;
  archetype: Archetype | null;
  followers: number;
  socialScore: number;
};

export type RankNpcConfig = {
  onRemove: RankNpcRemoveBehavior;
  initialPostCount: number;
  celebrities: RankNpcConfigEntry[];
};

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), "config", "rank-npcs.json");

function getConfigPath(): string {
  const configured = process.env.RANK_NPCS_CONFIG_PATH?.trim();
  return configured ? path.resolve(configured) : DEFAULT_CONFIG_PATH;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function parseSocialRank(value: unknown): SocialRank {
  if (value === "icon" || value === "celebrity") {
    return value;
  }

  return "celebrity";
}

function titleCaseFromXHandle(xHandle: string): string {
  return xHandle
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\d+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseRealName(
  value: unknown,
  xHandle: string,
  index: number,
): string {
  if (value == null || value === "") {
    return titleCaseFromXHandle(xHandle);
  }

  const realName = String(value).trim();

  if (!realName) {
    throw new Error(`celebrities[${index}].realName cannot be empty.`);
  }

  return realName;
}

function parseEntry(raw: unknown, index: number): RankNpcConfigEntry {
  if (!raw || typeof raw !== "object") {
    throw new Error(`celebrities[${index}] must be an object.`);
  }

  const entry = raw as Record<string, unknown>;
  const xHandle = normalizeHandle(String(entry.xHandle ?? ""));
  const name = String(entry.name ?? "").trim();
  const handle = normalizeHandle(String(entry.handle ?? ""));
  const handleError = validateHandle(handle);

  if (!xHandle) {
    throw new Error(`celebrities[${index}].xHandle is required.`);
  }

  if (!name) {
    throw new Error(`celebrities[${index}].name is required.`);
  }

  if (handleError) {
    throw new Error(`celebrities[${index}].handle: ${handleError}`);
  }

  const kindRaw = String(entry.kind ?? "person");
  const kind: PageKind = isPageKind(kindRaw) ? kindRaw : "person";
  const rawArchetype =
    entry.archetype == null || entry.archetype === ""
      ? null
      : normalizeArchetype(String(entry.archetype));

  if (entry.archetype != null && entry.archetype !== "" && !rawArchetype) {
    throw new Error(`celebrities[${index}].archetype is invalid.`);
  }

  if (
    rawArchetype &&
    pageKindUsesArchetype(kind) &&
    !isArchetypeAllowedForPageKind(kind, rawArchetype)
  ) {
    throw new Error(
      `celebrities[${index}].archetype does not fit kind "${kind}".`,
    );
  }

  const archetype = coerceArchetypeForPageKind(kind, rawArchetype);

  return {
    xHandle,
    realName: parseRealName(entry.realName, xHandle, index),
    name,
    handle,
    fixedSocialRank: parseSocialRank(entry.fixedSocialRank),
    kind,
    archetype,
    followers: parsePositiveInt(entry.followers, 1_000_000),
    socialScore: parsePositiveInt(entry.socialScore, 100_000),
  };
}

function validateUniqueEntries(entries: RankNpcConfigEntry[]): void {
  const handles = new Set<string>();
  const xHandles = new Set<string>();

  for (const entry of entries) {
    if (handles.has(entry.handle)) {
      throw new Error(`Duplicate knock-off handle "${entry.handle}" in config.`);
    }

    if (xHandles.has(entry.xHandle)) {
      throw new Error(`Duplicate xHandle "${entry.xHandle}" in config.`);
    }

    handles.add(entry.handle);
    xHandles.add(entry.xHandle);
  }
}

export function parseRankNpcConfig(raw: unknown): RankNpcConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("Rank NPC config must be a JSON object.");
  }

  const data = raw as Record<string, unknown>;
  const celebritiesRaw = data.celebrities;

  if (!Array.isArray(celebritiesRaw)) {
    throw new Error("Rank NPC config must include a celebrities array.");
  }

  const celebrities = celebritiesRaw.map((entry, index) =>
    parseEntry(entry, index),
  );
  validateUniqueEntries(celebrities);

  const onRemove =
    data.onRemove === "delete" ? "delete" : ("deactivate" as const);

  return {
    onRemove,
    initialPostCount: parsePositiveInt(data.initialPostCount, 3),
    celebrities,
  };
}

export async function loadRankNpcConfig(): Promise<RankNpcConfig> {
  const configPath = getConfigPath();
  const contents = await readFile(configPath, "utf8");
  const parsed = JSON.parse(contents) as unknown;
  return parseRankNpcConfig(parsed);
}
