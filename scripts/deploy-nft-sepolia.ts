import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import "./load-env";

const contractsDir = resolve(process.cwd(), "contracts");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    console.error(`Missing ${name}. Add it to .env or .env.local.`);
    process.exit(1);
  }

  return value;
}

function main(): void {
  const rpcUrl =
    process.env.BASE_SEPOLIA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ||
    "https://sepolia.base.org";

  const privateKey = requireEnv("PRIVATE_KEY");
  requireEnv("NFT_TREASURY_ADDRESS");
  requireEnv("NFT_ROYALTY_BPS");
  requireEnv("NFT_MINT_FEE_WEI");

  const env = {
    ...process.env,
    BASE_SEPOLIA_RPC_URL: rpcUrl,
  };

  console.info("[deploy:nft:sepolia] Deploying TrollFarmTycoon to Base Sepolia...");
  console.info(`[deploy:nft:sepolia] RPC: ${rpcUrl}`);

  const result = spawnSync(
    "forge",
    [
      "script",
      "script/Deploy.s.sol:Deploy",
      "--rpc-url",
      rpcUrl,
      "--broadcast",
      "--private-key",
      privateKey,
    ],
    {
      cwd: contractsDir,
      env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error(result.error.message);

    if ("code" in result.error && result.error.code === "ENOENT") {
      console.error(
        "Foundry is not installed. See https://book.getfoundry.sh/getting-started/installation",
      );
    }

    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.info(
    "[deploy:nft:sepolia] Done. Set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS in .env.local to the deployed address.",
  );
}

main();
