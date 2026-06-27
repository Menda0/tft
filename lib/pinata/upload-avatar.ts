export class PinataUploadError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "PinataUploadError";
    this.details = details;
  }
}

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
  // Public gateway works for any CID. Dedicated gateways often block anonymous
  // reads unless "Gateway Access" is opened in the Pinata dashboard.
  const gateway = process.env.PINATA_GATEWAY?.trim();

  if (gateway && process.env.PINATA_USE_DEDICATED_GATEWAY === "true") {
    return gateway.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  return "gateway.pinata.cloud";
}

function buildIpfsUrl(cid: string): string {
  return `https://${getPinataGatewayBase()}/ipfs/${cid}`;
}

export async function uploadAvatarToPinata(input: {
  personalityId: string;
  handle: string;
  buffer: Buffer;
  contentType: string;
  extension: string;
}): Promise<string> {
  const jwt = getPinataJwt();
  const fileName = `fakex-${input.handle}-${input.personalityId}.${input.extension}`;
  const bytes = Uint8Array.from(input.buffer);
  const blob = new Blob([bytes], { type: input.contentType });
  const file = new File([blob], fileName, { type: input.contentType });
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
      "Could not upload avatar to Pinata.",
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

  return buildIpfsUrl(cid);
}
