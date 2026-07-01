"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  confirmCatalogMintRequest,
  prepareCatalogMintRequest,
} from "@/lib/admin/personality-catalog-client";
import { FAKEX_PERSONALITY_NFT_ABI } from "@/lib/nft/contract";

type CatalogMintButtonProps = {
  personalityId: string;
  personalityName: string;
  disabled?: boolean;
  onMinted?: () => void;
};

export function CatalogMintButton({
  personalityId,
  personalityName,
  disabled = false,
  onMinted,
}: CatalogMintButtonProps) {
  const { token } = useAuth();
  const { writeContractAsync, isPending } = useWriteContract();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [openSeaUrl, setOpenSeaUrl] = useState<string | null>(null);

  async function handleMint() {
    if (!token) {
      setStatus("Log in as admin to mint.");
      return;
    }

    setStatus("Preparing metadata...");
    const prepared = await prepareCatalogMintRequest(token, personalityId);

    if (!prepared.ok) {
      setStatus(prepared.error);
      return;
    }

    const { data } = prepared;

    try {
      setStatus("Confirm the mint in MetaMask (NFT goes to treasury)...");
      const txHash = await writeContractAsync({
        address: data.contractAddress as `0x${string}`,
        abi: FAKEX_PERSONALITY_NFT_ABI,
        functionName: "mint",
        args: [
          data.mintToAddress as `0x${string}`,
          data.personalityId,
          data.metadataUri,
        ],
        value: BigInt(data.mintFee),
        chainId: data.chainId,
      });

      setStatus("Confirming on chain...");
      const confirmed = await confirmCatalogMintRequest(
        token,
        personalityId,
        txHash,
      );

      if (!confirmed.ok) {
        setStatus(confirmed.error);
        return;
      }

      setOpenSeaUrl(confirmed.openSeaUrl);
      setStatus("NFT minted to treasury.");
      onMinted?.();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Mint transaction failed.",
      );
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={disabled || isPending}
        onClick={() => {
          setStatus(null);
          setOpenSeaUrl(null);
          setOpen(true);
        }}
        className="rounded-none border-2 border-[#fff1e8] bg-[#ffa300] px-2 py-1 text-[10px] text-[#1d2b53] hover:bg-[#ffcc00]"
      >
        MINT
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Mint catalog NFT</DialogTitle>
            <DialogDescription>
              Mint {personalityName} to the project treasury wallet. The
              personality stays out of the game until a holder imports it after
              transfer.
            </DialogDescription>
          </DialogHeader>

          {status ? (
            <p className="text-sm text-[#c2c3c7]">{status}</p>
          ) : null}

          {openSeaUrl ? (
            <a
              href={openSeaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#29adff] underline"
            >
              View on OpenSea
            </a>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              disabled={isPending || Boolean(openSeaUrl)}
              onClick={() => void handleMint()}
              className="rounded-none border-2 border-[#fff1e8] bg-[#00e436] text-[#1d2b53]"
            >
              {isPending ? "Waiting for wallet..." : "Mint to treasury"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
