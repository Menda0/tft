# Fakex Personality NFT (Base)

ERC-721 + ERC-2981 contract for minting fakex personalities on Base.

## Setup

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts forge-std --no-commit
```

## Deploy

Set env vars (see repo `.env.example`), then:

```bash
# Base Sepolia (testnet)
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Base mainnet
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
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
