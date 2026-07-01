# TrollFarmTycoon NFT (Base)

ERC-721 + ERC-2981 contract for minting Troll Farm Tycoon personalities on Base.

## Setup

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

## Deploy

Set env vars in `.env` / `.env.local` (see repo `.env.example`), including `PRIVATE_KEY`, then from the repo root:

```bash
# Base Sepolia (testnet)
npm run deploy:nft:sepolia

# Base mainnet
npm run deploy:nft:mainnet
```

Or manually:

```bash
# Base Sepolia (testnet)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY

# Base mainnet (add --verify when BASESCAN_API_KEY is set)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Copy the deployed address into `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`.

## Contract

- `mint(to, personalityId, tokenURI)` — payable; forwards `mintFee` to treasury
- ERC-2981 default royalty to treasury (`NFT_ROYALTY_BPS`, e.g. 500 = 5%)
- `personalityIdOf(tokenId)` / `tokenIdOfPersonality(personalityId)` for app sync

## OpenSea

After deploy, collection indexes automatically. Users list manually at [opensea.io](https://opensea.io) with the wallet that holds the NFT.

## Alchemy Notify

Create a webhook for `ADDRESS_ACTIVITY` or custom `Transfer` logs on the contract address. Point it to:

`POST https://your-domain.com/api/webhooks/nft-transfer`

Set `ALCHEMY_NOTIFY_SIGNING_KEY` to verify webhook signatures.
