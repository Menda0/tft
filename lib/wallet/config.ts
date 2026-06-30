import { base, baseSepolia, type Chain } from "viem/chains";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

function getTargetChainId(): number {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : base.id;
  return Number.isFinite(parsed) ? parsed : base.id;
}

const targetChainId = getTargetChainId();
const chains: readonly [Chain, ...Chain[]] =
  targetChainId === baseSepolia.id
    ? [baseSepolia, base]
    : [base, baseSepolia];

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL ??
        process.env.BASE_SEPOLIA_RPC_URL,
    ),
  },
  ssr: true,
});

export const defaultChain = chains[0]!;
