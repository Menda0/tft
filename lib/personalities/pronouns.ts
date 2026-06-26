export const PRONOUNS = [
  "he_him",
  "she_her",
  "they_them",
  "he_they",
  "she_they",
  "it_its",
  "xe_xem",
  "ze_zir",
  "fae_faer",
  "ey_em",
  "any",
  "use_name",
  "ask_me",
  "prefer_not_to_say",
] as const;

export type Pronouns = (typeof PRONOUNS)[number];

export const PRONOUN_LABELS: Record<Pronouns, string> = {
  he_him: "he/him",
  she_her: "she/her",
  they_them: "they/them",
  he_they: "he/they",
  she_they: "she/they",
  it_its: "it/its",
  xe_xem: "xe/xem",
  ze_zir: "ze/zir",
  fae_faer: "fae/faer",
  ey_em: "ey/em",
  any: "any pronouns",
  use_name: "use my name",
  ask_me: "ask me",
  prefer_not_to_say: "prefer not to say",
};

export const PRONOUN_AVATAR_HINTS: Record<Pronouns, string> = {
  he_him: "uses he/him pronouns",
  she_her: "uses she/her pronouns",
  they_them: "uses they/them pronouns",
  he_they: "uses he/they pronouns",
  she_they: "uses she/they pronouns",
  it_its: "uses it/its pronouns",
  xe_xem: "uses xe/xem pronouns",
  ze_zir: "uses ze/zir pronouns",
  fae_faer: "uses fae/faer pronouns",
  ey_em: "uses ey/em pronouns",
  any: "uses any pronouns",
  use_name: "uses their name instead of pronouns",
  ask_me: "uses pronouns that should be asked about",
  prefer_not_to_say: "does not disclose pronouns",
};

export function isPronouns(value: string): value is Pronouns {
  return PRONOUNS.includes(value as Pronouns);
}

export function formatPronounLabel(pronouns: Pronouns): string {
  return PRONOUN_LABELS[pronouns];
}
