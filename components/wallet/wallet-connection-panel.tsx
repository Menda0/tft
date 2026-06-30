"use client";

import { Button } from "@/components/ui/button";
import { useWalletConnection } from "@/components/wallet/use-wallet-connection";

const menuItemClass =
  "w-full border-b-2 border-[#fff1e8] px-3 py-3 text-left text-sm text-[#fff1e8] transition-colors hover:bg-[#29366f] disabled:cursor-not-allowed disabled:opacity-50";

type WalletConnectionPanelProps = {
  variant?: "menu" | "panel";
  onAction?: () => void;
};

export function WalletConnectionPanel({
  variant = "panel",
  onAction,
}: WalletConnectionPanelProps) {
  const {
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
  } = useWalletConnection();

  if (!user) {
    return null;
  }

  if (variant === "menu") {
    return (
      <>
        {isConnected ? (
          <div className="border-b-2 border-[#fff1e8] px-3 py-3">
            <p className="pixel-heading text-[9px] text-[#29adff]">WALLET</p>
            <p className="mt-1 truncate font-mono text-xs text-[#ffa300]">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </p>
            {isLinked ? (
              <p className="mt-1 text-[10px] text-[#00e756]">Linked to account</p>
            ) : (
              <p className="mt-1 text-[10px] text-[#83769a]">Not linked to account</p>
            )}
          </div>
        ) : null}

        {!isConnected ? (
          <button
            type="button"
            disabled={isConnecting}
            onClick={() => void handleConnect()}
            className={menuItemClass}
          >
            {isConnecting ? "Connecting..." : "Connect wallet"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={!isConnected || busy || isLinked}
          onClick={() => void handleLink()}
          className={menuItemClass}
        >
          {busy ? "Linking..." : "Link wallet"}
        </button>

        <button
          type="button"
          disabled={!isConnected}
          onClick={() => {
            disconnect();
            onAction?.();
          }}
          className={menuItemClass}
        >
          Disconnect wallet
        </button>

        {linkedWallets.length > 0 ? (
          <div className="border-b-2 border-[#fff1e8] px-3 py-3">
            <p className="pixel-heading text-[9px] text-[#29adff]">
              LINKED WALLETS
            </p>
            <ul className="mt-2 space-y-2">
              {linkedWallets.map((wallet) => (
                <li
                  key={`${wallet.address}-${wallet.chainId}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate font-mono text-[10px] text-[#fff1e8]">
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-[10px] text-[#ff6b6b] hover:underline"
                    disabled={busy}
                    onClick={() => void handleUnlink(wallet.address)}
                  >
                    Unlink
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {status ? (
          <p className="border-b-2 border-[#fff1e8] px-3 py-2 text-xs text-[#ffa300]">
            {status}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {!isConnected ? (
        <Button
          type="button"
          variant="outline"
          disabled={isConnecting}
          onClick={() => void handleConnect()}
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[#c2c3c7]">
            Connected:{" "}
            <span className="font-mono text-[#ffa300]">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </p>
          {!isLinked ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleLink()}
            >
              {busy ? "Linking..." : "Link wallet"}
            </Button>
          ) : (
            <p className="text-xs text-[#00e756]">Linked to your account</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => disconnect()}>
            Disconnect wallet
          </Button>
        </div>
      )}

      {linkedWallets.length > 0 ? (
        <div className="space-y-1">
          <p className="pixel-heading text-[9px] text-[#29adff]">LINKED WALLETS</p>
          {linkedWallets.map((wallet) => (
            <div
              key={`${wallet.address}-${wallet.chainId}`}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="font-mono text-[#fff1e8]">
                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
              </span>
              <button
                type="button"
                className="text-[#ff6b6b] hover:underline"
                disabled={busy}
                onClick={() => void handleUnlink(wallet.address)}
              >
                Unlink
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#ffa300]">{status}</p> : null}
    </div>
  );
}
