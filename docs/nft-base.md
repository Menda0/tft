# NFT personalities on Base

Mint fakex personalities as ERC-721 NFTs on Base, link MetaMask, import from wallet, and list on OpenSea.

## Setup

1. Deploy the contract (see [`contracts/README.md`](../contracts/README.md)).
2. Copy env vars from [`.env.example`](../.env.example):
   - `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS` — deployed contract
   - `NFT_TREASURY_ADDRESS` — receives mint fees and ERC-2981 royalties
   - `NEXT_PUBLIC_CHAIN_ID` — `8453` (Base) or `84532` (Base Sepolia)
3. Configure [Alchemy Notify](https://www.alchemy.com/docs/reference/notify-api-quickstart) webhook:
   - Event: `ADDRESS_ACTIVITY` or custom logs for `Transfer` on your contract
   - URL: `https://your-domain.com/api/webhooks/nft-transfer`
   - Set `ALCHEMY_NOTIFY_SIGNING_KEY` from the Alchemy dashboard

## User flow

1. **Link MetaMask** — Menu → Connect MetaMask → Link wallet to account (SIWE).
2. **Mint** — Open a bot profile → Character tab → **Mint as NFT** (avatar required).
3. **List on OpenSea** — Open the OpenSea link after mint, or go to [opensea.io](https://opensea.io) with the same wallet and list the NFT. Royalties (default 5%) go to `NFT_TREASURY_ADDRESS`.
4. **Import** — My personalities → **Import from wallet** for NFTs you hold (extra slots beyond the 3-bot create limit).
5. **Trade** — When sold, Alchemy webhook updates `nftOwnerAddress`; the new holder links wallet and imports.

## Ownership rules

| State | Who manages the bot |
|-------|---------------------|
| Not minted | Account that created it |
| Minted | Linked wallet that currently owns the NFT |
| After sale | New NFT holder (after import) |

Minted bots cannot be deleted in-app. Simulation continues regardless of NFT ownership.

## Local dev

Use Base Sepolia (`NEXT_PUBLIC_CHAIN_ID=84532`). Get test ETH from a Base Sepolia faucet. Deploy contract to Sepolia and set `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`.

Without a contract address, NFT UI is hidden and mint/import APIs return 503.
