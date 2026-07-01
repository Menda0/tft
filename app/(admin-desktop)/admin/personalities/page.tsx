import type { Metadata } from "next";

import { PersonalityCatalogDashboard } from "@/components/admin/personality-catalog-dashboard";

export const metadata: Metadata = {
  title: "Admin · Personality catalog",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPersonalityCatalogPage() {
  return <PersonalityCatalogDashboard />;
}
