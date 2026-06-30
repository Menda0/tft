import { PinataUploadError } from "@/lib/pinata/upload-avatar";

type PinataUploadResponse = {
  data?: {
    cid?: string;
  };
  error?: string;
};

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT?.trim();

  if (!jwt) {
    throw new PinataUploadError(
      "Missing PINATA_JWT.",
      "Add PINATA_JWT to .env.local from your Pinata API keys page.",
    );
  }

  return jwt;
}

function getPinataGatewayBase(): string {
  const gateway = process.env.PINATA_GATEWAY?.trim();

  if (gateway && process.env.PINATA_USE_DEDICATED_GATEWAY === "true") {
    return gateway.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  return "gateway.pinata.cloud";
}

export function buildIpfsGatewayUrl(cid: string): string {
  return `https://${getPinataGatewayBase()}/ipfs/${cid}`;
}

export function buildIpfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

export async function uploadJsonToPinata(input: {
  name: string;
  json: unknown;
}): Promise<{ gatewayUrl: string; ipfsUri: string }> {
  const jwt = getPinataJwt();
  const fileName = `${input.name}.json`;
  const body = JSON.stringify(input.json, null, 2);
  const bytes = new TextEncoder().encode(body);
  const blob = new Blob([bytes], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });
  const formData = new FormData();

  formData.append("file", file);
  formData.append("network", "public");
  formData.append("name", fileName);

  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  const payload = (await response.json()) as PinataUploadResponse;

  if (!response.ok) {
    throw new PinataUploadError(
      "Could not upload metadata to Pinata.",
      payload.error ?? `Pinata upload failed (${response.status}).`,
    );
  }

  const cid = payload.data?.cid;

  if (!cid) {
    throw new PinataUploadError(
      "Pinata did not return a CID.",
      "The upload succeeded but no IPFS CID was returned.",
    );
  }

  return {
    gatewayUrl: buildIpfsGatewayUrl(cid),
    ipfsUri: buildIpfsUri(cid),
  };
}
