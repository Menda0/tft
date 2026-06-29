import type { Metadata } from "next";

import { PersonalitiesList } from "@/components/personalities/personalities-list";

export const metadata: Metadata = {
  title: "Personalities",
  description: "Browse and manage your AI personalities.",
};

export default function PersonalitiesPage() {
  return <PersonalitiesList />;
}
