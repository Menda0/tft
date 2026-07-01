"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CatalogMintButton } from "@/components/admin/catalog-mint-button";
import { CatalogPersonalityProfileDialog } from "@/components/admin/catalog-personality-profile-dialog";
import { CatalogPersonalityForm } from "@/components/admin/catalog-personality-form";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DESKTOP_BAR_BUTTON_CLASS,
  DESKTOP_BAR_BUTTON_LABEL_CLASS,
} from "@/components/layout/app-bar-styles";
import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { Button } from "@/components/ui/button";
import {
  generateCatalogAvatarRequest,
  listCatalogPersonalitiesRequest,
  type CatalogPersonalityListItem,
} from "@/lib/admin/personality-catalog-client";

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: string): string {
  if (status === "ready") {
    return "text-[#00e436]";
  }

  if (status === "failed") {
    return "text-[#ff004d]";
  }

  return "text-[#ffa300]";
}

function CatalogRow({
  item,
  token,
  onRefresh,
  onViewProfile,
}: {
  item: CatalogPersonalityListItem;
  token: string;
  onRefresh: () => void;
  onViewProfile: (item: CatalogPersonalityListItem) => void;
}) {
  const [avatarLoading, setAvatarLoading] = useState(false);

  async function handleRetryAvatar() {
    setAvatarLoading(true);
    await generateCatalogAvatarRequest(token, item.id);
    setAvatarLoading(false);
    onRefresh();
  }

  const canMint =
    item.avatarStatus === "ready" &&
    Boolean(item.avatarUrl) &&
    !item.nft;

  return (
    <tr className="border-b border-[#29366f]">
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <PersonalityAvatar
            personality={{
              name: item.name,
              handle: item.handle,
              avatarUrl: item.avatarUrl,
              avatarStatus: item.avatarStatus,
            }}
            size="sm"
          />
          <div className="flex flex-col items-start">
            <button
              type="button"
              onClick={() => onViewProfile(item)}
              className="text-left font-bold text-[#fff1e8] hover:text-[#ffa300]"
            >
              {item.name}
            </button>
            <button
              type="button"
              onClick={() => onViewProfile(item)}
              className="text-left text-xs text-[#29adff] hover:text-[#ffa300]"
            >
              @{item.handle}
            </button>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={`text-xs ${statusColor(item.avatarStatus)}`}>
          {item.avatarStatus}
        </span>
        {item.avatarStatus === "failed" ||
        item.avatarStatus === "pending" ? (
          <Button
            type="button"
            disabled={avatarLoading}
            onClick={() => void handleRetryAvatar()}
            className="ml-2 rounded-none border border-[#fff1e8] bg-[#29366f] px-2 py-0.5 text-[9px] text-[#fff1e8]"
          >
            {avatarLoading ? "..." : "GEN"}
          </Button>
        ) : null}
      </td>
      <td className="px-3 py-3 text-xs text-[#c2c3c7]">
        {item.nft ? (
          <span>
            Minted · token #{item.nft.tokenId}
          </span>
        ) : (
          <span className="text-[#83769a]">Unminted</span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-[#c2c3c7]">
        {item.nftOwnerAddress ? (
          <span className="font-mono">
            {item.nftOwnerAddress.slice(0, 6)}…
            {item.nftOwnerAddress.slice(-4)}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3 text-xs text-[#c2c3c7]">
        {formatDate(item.createdAt)}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => onViewProfile(item)}
            className="rounded-none border-2 border-[#fff1e8] bg-[#29366f] px-2 py-1 text-[10px] text-[#fff1e8] hover:bg-[#1d2b53]"
          >
            PROFILE
          </Button>
          {canMint ? (
            <CatalogMintButton
              personalityId={item.id}
              personalityName={item.name}
              onMinted={onRefresh}
            />
          ) : null}
          {item.openSeaUrl ? (
            <a
              href={item.openSeaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#29adff] underline"
            >
              OpenSea
            </a>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function PersonalityCatalogDashboard() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [items, setItems] = useState<CatalogPersonalityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [profileItem, setProfileItem] =
    useState<CatalogPersonalityListItem | null>(null);

  const loadItems = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listCatalogPersonalitiesRequest(token);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setItems(result.personalities);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/");
      return;
    }

    void loadItems();
  }, [isReady, loadItems, router, user]);

  useEffect(() => {
    if (!token || !user || user.role !== "admin") {
      return;
    }

    const hasPendingAssets = items.some(
      (item) =>
        item.avatarStatus === "pending" ||
        item.avatarStatus === "generating" ||
        item.descriptionStatus === "pending" ||
        item.descriptionStatus === "generating",
    );

    if (!hasPendingAssets) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadItems();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [items, loadItems, token, user]);

  if (!isReady || !user || user.role !== "admin") {
    return null;
  }

  const mintedCount = items.filter((item) => item.nft).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="pixel-heading text-[10px] text-[#29adff]">ADMIN</p>
          <h1 className="mt-1 text-xl font-bold text-[#fff1e8]">
            Personality catalog
          </h1>
          <p className="mt-1 text-sm text-[#83769a]">
            {mintedCount} minted · {items.length} total · excluded from game
            until imported
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#29adff]`}
          >
            <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#1d2b53]`}>
              {showCreate ? "HIDE FORM" : "CREATE NEW"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
            className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#1d2b53] disabled:opacity-60`}
          >
            <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#fff1e8]`}>
              REFRESH
            </span>
          </button>
        </div>
      </div>

      {showCreate ? (
        <CatalogPersonalityForm
          onCreated={() => {
            setShowCreate(false);
            void loadItems();
          }}
        />
      ) : null}

      {error ? (
        <p className="pixel-border bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
          {error}
        </p>
      ) : null}

      <div className="pixel-border overflow-x-auto bg-[#1d2b53]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#29366f] text-[10px] pixel-heading text-[#83769a]">
              <th className="px-3 py-3">Personality</th>
              <th className="px-3 py-3">Avatar</th>
              <th className="px-3 py-3">Mint</th>
              <th className="px-3 py-3">NFT owner</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[#83769a]">
                  Loading catalog...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[#83769a]">
                  No catalog personalities yet. Create one to get started.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <CatalogRow
                  key={item.id}
                  item={item}
                  token={token!}
                  onRefresh={() => void loadItems()}
                  onViewProfile={setProfileItem}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <CatalogPersonalityProfileDialog
        item={profileItem}
        open={profileItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProfileItem(null);
          }
        }}
      />
    </div>
  );
}
