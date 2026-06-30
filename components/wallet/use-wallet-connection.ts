"use client";

import { useCallback, useEffect, useState } from "react";
import { SiweMessage } from "siwe";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { useAuth } from "@/components/auth/auth-provider";
import { defaultChain } from "@/lib/wallet/config";
import {
  fetchWalletNonce,
  linkWalletRequest,
  listLinkedWalletsRequest,
  unlinkWalletRequest,
} from "@/lib/wallet/client";
import type { LinkedWallet } from "@/lib/db/users";

export function useWalletConnection() {
  const { token, user } = useAuth();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadWallets = useCallback(async () => {
    if (!token) {
      setLinkedWallets([]);
      return;
    }

    const result = await listLinkedWalletsRequest(token);

    if (result.ok) {
      setLinkedWallets(result.wallets);
    }
  }, [token]);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const isLinked = Boolean(
    address &&
      linkedWallets.some(
        (wallet) => wallet.address.toLowerCase() === address.toLowerCase(),
      ),
  );

  async function handleConnect() {
    const connector = connectors[0];

    if (!connector) {
      setStatus("MetaMask not detected.");
      return;
    }

    setStatus(null);
    connect({ connector, chainId: defaultChain.id });
  }

  async function handleLink() {
    if (!token || !address || !user) {
      setStatus("Log in before linking a wallet.");
      return;
    }

    if (chainId !== defaultChain.id) {
      switchChain({ chainId: defaultChain.id });
      setStatus(`Switch to ${defaultChain.name} in MetaMask.`);
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      const nonceResult = await fetchWalletNonce(token, address);

      if (!nonceResult.ok) {
        setStatus(nonceResult.error);
        return;
      }

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Link your wallet to your fakex account.",
        uri: window.location.origin,
        version: "1",
        chainId: defaultChain.id,
        nonce: nonceResult.nonce,
      });

      const prepared = message.prepareMessage();
      const ethereum = (
        window as Window & {
          ethereum?: {
            request: (args: {
              method: string;
              params: string[];
            }) => Promise<string>;
          };
        }
      ).ethereum;

      if (!ethereum) {
        setStatus("MetaMask not detected.");
        return;
      }

      const signature = await ethereum.request({
        method: "personal_sign",
        params: [prepared, address],
      });

      const linkResult = await linkWalletRequest(token, prepared, signature);

      if (!linkResult.ok) {
        setStatus(linkResult.error);
        return;
      }

      setLinkedWallets(linkResult.wallets);
      setStatus("Wallet linked.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not link wallet.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink(walletAddress: string) {
    if (!token) {
      return;
    }

    setBusy(true);
    const result = await unlinkWalletRequest(token, walletAddress);
    setBusy(false);

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    setLinkedWallets(result.wallets);
    setStatus("Wallet unlinked.");
  }

  return {
    user,
    address,
    isConnected,
    isConnecting,
    isLinked,
    linkedWallets,
    status,
    busy,
    handleConnect,
    handleLink,
    handleUnlink,
    disconnect,
  };
}
