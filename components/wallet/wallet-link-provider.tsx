"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/components/auth/auth-provider";
import type { LinkedWallet } from "@/lib/db/users";
import { listLinkedWalletsRequest } from "@/lib/wallet/client";

type WalletLinkContextValue = {
  linkedWallets: LinkedWallet[];
  linkedWalletRevision: number;
  setLinkedWallets: (wallets: LinkedWallet[]) => void;
  refreshLinkedWallets: () => Promise<void>;
};

const WalletLinkContext = createContext<WalletLinkContextValue | null>(null);

export function WalletLinkProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [linkedWallets, setLinkedWalletsState] = useState<LinkedWallet[]>([]);
  const [linkedWalletRevision, setLinkedWalletRevision] = useState(0);

  const setLinkedWallets = useCallback((wallets: LinkedWallet[]) => {
    setLinkedWalletsState(wallets);
    setLinkedWalletRevision((revision) => revision + 1);
  }, []);

  const refreshLinkedWallets = useCallback(async () => {
    if (!token) {
      setLinkedWalletsState([]);
      setLinkedWalletRevision((revision) => revision + 1);
      return;
    }

    const result = await listLinkedWalletsRequest(token);

    if (result.ok) {
      setLinkedWalletsState(result.wallets);
      setLinkedWalletRevision((revision) => revision + 1);
    }
  }, [token]);

  useEffect(() => {
    void refreshLinkedWallets();
  }, [refreshLinkedWallets]);

  return (
    <WalletLinkContext.Provider
      value={{
        linkedWallets,
        linkedWalletRevision,
        setLinkedWallets,
        refreshLinkedWallets,
      }}
    >
      {children}
    </WalletLinkContext.Provider>
  );
}

export function useWalletLink() {
  const context = useContext(WalletLinkContext);

  if (!context) {
    throw new Error("useWalletLink must be used within WalletLinkProvider");
  }

  return context;
}
