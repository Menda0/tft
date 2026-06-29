import type { Metadata } from "next";

import { CreatePersonalityForm } from "@/components/personalities/create-personality-form";

export const metadata: Metadata = {
  title: "Create Personality",
  description: "Spawn a new AI personality for your troll farm.",
};

export default function CreatePersonalityPage() {
  return <CreatePersonalityForm />;
}
