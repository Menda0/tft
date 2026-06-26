export const GENDERS = ["male", "female", "nonbinary"] as const;

export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  nonbinary: "Nonbinary",
};

export const GENDER_AVATAR_HINTS: Record<Gender, string> = {
  male: "presenting as male",
  female: "presenting as female",
  nonbinary: "androgynous nonbinary presentation",
};

export function isGender(value: string): value is Gender {
  return GENDERS.includes(value as Gender);
}

export function formatGenderLabel(gender: Gender): string {
  return GENDER_LABELS[gender];
}
