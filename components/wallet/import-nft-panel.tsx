"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useWalletLink } from "@/components/wallet/wallet-link-provider";
import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { usePersonalitiesRefresh } from "@/components/personalities/personalities-refresh-provider";
import { ProfileLink } from "@/components/profile/profile-link";
import { Button } from "@/components/ui/button";
import {
  importNftRequest,
  listWalletNftsRequest,
  type WalletNftItem,
} from "@/lib/wallet/client";

type ImportNftPanelProps = {
  onImported?: () => void | Promise<void>;
};

export function ImportNftPanel({ onImported }: ImportNftPanelProps) {
  const { token } = useAuth();
  const { linkedWalletRevision } = useWalletLink();
  const { refreshPersonalities, personalitiesRevision } = usePersonalitiesRefresh();
  const [nfts, setNfts] = useState<WalletNftItem[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  const loadNfts = useCallback(async () => {
    if (!token) {
      setNfts([]);
      return;
    }

    const result = await listWalletNftsRequest(token);

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    setEnabled(result.enabled);
    setHasLinkedWallet(result.hasLinkedWallet);
    setNfts(result.nfts);
  }, [token]);

  useEffect(() => {
    void loadNfts();
  }, [loadNfts, linkedWalletRevision, personalitiesRevision]);

  async function finishImport(statusMessage: string) {
    setStatus(statusMessage);
    await loadNfts();
    refreshPersonalities();
    await onImported?.();
  }

  async function handleImport(tokenId: string) {
    if (!token || importingAll) {
      return;
    }

    setImportingId(tokenId);
    setStatus(null);

    const result = await importNftRequest(token, tokenId);
    setImportingId(null);

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    await finishImport("Personality imported.");
  }

  async function handleImportAll(tokenIds: string[]) {
    if (!token || tokenIds.length < 2 || importingAll) {
      return;
    }

    setImportingAll(true);
    setStatus(null);

    let imported = 0;

    for (const tokenId of tokenIds) {
      setImportingId(tokenId);

      const result = await importNftRequest(token, tokenId);

      if (!result.ok) {
        setImportingId(null);
        setImportingAll(false);
        setStatus(
          imported > 0
            ? `Imported ${imported}. ${result.error}`
            : result.error,
        );
        await loadNfts();
        if (imported > 0) {
          refreshPersonalities();
          await onImported?.();
        }
        return;
      }

      imported += 1;
    }

    setImportingId(null);
    setImportingAll(false);
    await finishImport(`Imported ${imported} personalities.`);
  }

  if (!token || !enabled) {
    return null;
  }

  const importable = nfts.filter((nft) => nft.tokenId && nft.importable);

  return (
    <section className="pixel-border bg-[#1d2b53] p-4 pixel-shadow-sm">
      <h2 className="pixel-heading text-sm text-[#29adff]">Import from wallet</h2>
      <p className="mt-2 text-xs text-[#c2c3c7]">
        NFT personalities you hold in a linked wallet can be imported as extra
        slots beyond your create limit.
      </p>

      {importable.length === 0 ? (
        <p className="mt-3 text-xs text-[#83769a]">
          {!hasLinkedWallet
            ? "Link a wallet to your account to import NFT personalities."
            : "No importable NFT personalities in your linked wallets."}
        </p>
      ) : (
        <>
          {importable.length >= 2 ? (
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={importingAll || importingId !== null}
              onClick={() =>
                void handleImportAll(importable.map((nft) => nft.tokenId!))
              }
            >
              {importingAll ? "Importing all..." : "Import all"}
            </Button>
          ) : null}

          <ul className="mt-3 space-y-3">
            {importable.map((nft) => (
              <li
                key={nft.tokenId!}
                className="flex items-center justify-between gap-3 border-b border-[#3e3546] pb-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PersonalityAvatar
                    personality={{
                      name: nft.name,
                      handle: nft.handle,
                      avatarUrl: nft.avatarUrl,
                      avatarStatus: "ready",
                    }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <ProfileLink handle={nft.handle} className="truncate text-sm">
                      @{nft.handle}
                    </ProfileLink>
                    <p className="text-[10px] text-[#83769a]">
                      Token #{nft.tokenId}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={importingAll || importingId === nft.tokenId}
                  onClick={() => void handleImport(nft.tokenId!)}
                >
                  {importingId === nft.tokenId ? "Importing..." : "Import"}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      {status ? <p className="mt-3 text-xs text-[#ffa300]">{status}</p> : null}
    </section>
  );
}
