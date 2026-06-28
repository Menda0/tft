import type { Pronouns } from "@/lib/personalities/pronouns";

export const GENDERS = [
  "male",
  "female",
  "nonbinary",
  "genderfluid",
  "agender",
  "bigender",
  "demigirl",
  "demiboy",
  "genderqueer",
  "trans_man",
  "trans_woman",
  "two_spirit",
  "intersex",
  "androgynous",
  "questioning",
  "prefer_not_to_say",
  "door",
] as const;

export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  nonbinary: "Nonbinary",
  genderfluid: "Genderfluid",
  agender: "Agender",
  bigender: "Bigender",
  demigirl: "Demigirl",
  demiboy: "Demiboy",
  genderqueer: "Genderqueer",
  trans_man: "Trans man",
  trans_woman: "Trans woman",
  two_spirit: "Two-Spirit",
  intersex: "Intersex",
  androgynous: "Androgynous",
  questioning: "Questioning",
  prefer_not_to_say: "Prefer not to say",
  door: "Door",
};

export const GENDER_AVATAR_HINTS: Record<Gender, string> = {
  male: "presenting as male",
  female: "presenting as female",
  nonbinary: "androgynous nonbinary presentation",
  genderfluid: "fluid androgynous presentation with mixed styling",
  agender: "neutral agender presentation without gendered styling",
  bigender: "mixed masculine and feminine presentation",
  demigirl: "mostly feminine with subtle androgynous details",
  demiboy: "mostly masculine with subtle androgynous details",
  genderqueer: "expressive genderqueer presentation outside the binary",
  trans_man: "trans masculine man",
  trans_woman: "trans feminine woman",
  two_spirit: "Two-Spirit presentation with cultural androgyny",
  intersex: "androgynous intersex presentation",
  androgynous: "balanced androgynous presentation",
  questioning: "soft neutral presentation while exploring identity",
  prefer_not_to_say: "neutral presentation without explicit gender cues",
  door: "a door, not a human",
};

const DEFAULT_PRONOUNS: Record<Gender, Pronouns> = {
  male: "he_him",
  female: "she_her",
  nonbinary: "they_them",
  genderfluid: "they_them",
  agender: "they_them",
  bigender: "they_them",
  demigirl: "she_they",
  demiboy: "he_they",
  genderqueer: "they_them",
  trans_man: "he_him",
  trans_woman: "she_her",
  two_spirit: "they_them",
  intersex: "they_them",
  androgynous: "they_them",
  questioning: "they_them",
  prefer_not_to_say: "prefer_not_to_say",
  door: "it_its",
};

export function isGender(value: string): value is Gender {
  return GENDERS.includes(value as Gender);
}

export function formatGenderLabel(gender: Gender): string {
  return GENDER_LABELS[gender];
}

export function defaultPronounsForGender(gender: Gender): Pronouns {
  return DEFAULT_PRONOUNS[gender];
}

export function isFeminineGender(gender: Gender): boolean {
  return gender === "female" || gender === "trans_woman" || gender === "demigirl";
}

export function isMasculineGender(gender: Gender): boolean {
  return gender === "male" || gender === "trans_man" || gender === "demiboy";
}

export function isDoorGender(gender: Gender): boolean {
  return gender === "door";
}

export function isNeutralGender(gender: Gender): boolean {
  return (
    !isFeminineGender(gender) &&
    !isMasculineGender(gender) &&
    !isDoorGender(gender)
  );
}
