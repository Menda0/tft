import type { PersonalityListItem } from "@/lib/profile/social-rank";

export type FarmerProfile = {
  username: string;
  totalClout: number;
  totalHeat: number;
  personalities: PersonalityListItem[];
};
