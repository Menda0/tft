"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type PersonalitiesRefreshContextValue = {
  personalitiesRevision: number;
  refreshPersonalities: () => void;
};

const PersonalitiesRefreshContext =
  createContext<PersonalitiesRefreshContextValue | null>(null);

export function PersonalitiesRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [personalitiesRevision, setPersonalitiesRevision] = useState(0);

  const refreshPersonalities = useCallback(() => {
    setPersonalitiesRevision((revision) => revision + 1);
  }, []);

  return (
    <PersonalitiesRefreshContext.Provider
      value={{ personalitiesRevision, refreshPersonalities }}
    >
      {children}
    </PersonalitiesRefreshContext.Provider>
  );
}

export function usePersonalitiesRefresh() {
  const context = useContext(PersonalitiesRefreshContext);

  if (!context) {
    throw new Error(
      "usePersonalitiesRefresh must be used within PersonalitiesRefreshProvider",
    );
  }

  return context;
}
