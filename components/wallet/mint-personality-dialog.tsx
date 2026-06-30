"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";

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
import { FAKEX_PERSONALITY_NFT_ABI } from "@/lib/nft/contract";
import {
  confirmMintRequest,
  prepareMintRequest,
} from "@/lib/wallet/client";

type MintPersonalityDialogProps = {
  personalityId: string;
  personalityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMinted?: (openSeaUrl: string | null) => void;
};

export function MintPersonalityDialog({
  personalityId,
  personalityName,
  open,
  onOpenChange,
  onMinted,
}: MintPersonalityDialogProps) {
  const { token } = useAuth();
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState<string | null>(null);
  const [openSeaUrl, setOpenSeaUrl] = useState<string | null>(null);

  async function handleMint() {
    if (!token) {
      setStatus("Log in to mint.");
      return;
    }

    if (!isConnected || !address) {
      setStatus("Connect and link MetaMask first.");
      return;
    }

    setStatus("Preparing metadata...");
    const prepared = await prepareMintRequest(token, personalityId);

    if (!prepared.ok) {
      setStatus(prepared.error);
      return;
    }

    const { data } = prepared;

    try {
      setStatus("Confirm the mint in MetaMask...");
      const txHash = await writeContractAsync({
        address: data.contractAddress as `0x${string}`,
        abi: FAKEX_PERSONALITY_NFT_ABI,
        functionName: "mint",
        args: [address, data.personalityId, data.metadataUri],
        value: BigInt(data.mintFee),
        chainId: data.chainId,
      });

      setStatus("Confirming on chain...");
      const confirmed = await confirmMintRequest(token, personalityId, txHash);

      if (!confirmed.ok) {
        setStatus(confirmed.error);
        return;
      }

      setOpenSeaUrl(confirmed.openSeaUrl);
      setStatus("NFT minted successfully.");
      onMinted?.(confirmed.openSeaUrl);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Mint transaction failed.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mint as NFT</DialogTitle>
          <DialogDescription>
            Mint {personalityName} on Base. You keep playing the bot; ownership
            can transfer when the NFT is sold. Royalties go to the project on
            secondary sales.
          </DialogDescription>
        </DialogHeader>

        {status ? <p className="text-sm text-[#ffa300]">{status}</p> : null}

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
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {!openSeaUrl ? (
            <Button
              type="button"
              disabled={isPending}
              onClick={() => void handleMint()}
            >
              {isPending ? "Minting..." : "Mint on Base"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
