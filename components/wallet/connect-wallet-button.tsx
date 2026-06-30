"use client";

import { WalletConnectionPanel } from "@/components/wallet/wallet-connection-panel";

type ConnectWalletButtonProps = {
  compact?: boolean;
};

export function ConnectWalletButton({ compact = false }: ConnectWalletButtonProps) {
  if (compact) {
    return <WalletConnectionPanel variant="menu" />;
  }

  return <WalletConnectionPanel variant="panel" />;
}
