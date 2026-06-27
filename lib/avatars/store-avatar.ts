import sharp from "sharp";

import { uploadAvatarToPinata } from "@/lib/pinata/upload-avatar";

const AVATAR_BACKGROUND = "#1d2b53";

type ParsedImageData = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

async function prepareAvatarBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  if (contentType === "image/svg+xml") {
    return { buffer, contentType, extension: "svg" };
  }

  if (contentType === "image/png") {
    const flattened = await sharp(buffer)
      .flatten({ background: AVATAR_BACKGROUND })
      .png()
      .toBuffer();

    return { buffer: flattened, contentType: "image/png", extension: "png" };
  }

  if (contentType === "image/jpeg") {
    return { buffer, contentType, extension: "jpg" };
  }

  if (contentType === "image/webp") {
    const flattened = await sharp(buffer)
      .flatten({ background: AVATAR_BACKGROUND })
      .webp()
      .toBuffer();

    return { buffer: flattened, contentType: "image/webp", extension: "webp" };
  }

  return { buffer, contentType, extension: "bin" };
}

export function parseImageDataUrl(dataUrl: string): ParsedImageData {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image data URL.");
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  if (contentType === "image/svg+xml") {
    return { buffer, contentType, extension: "svg" };
  }

  if (contentType === "image/png") {
    return { buffer, contentType, extension: "png" };
  }

  if (contentType === "image/jpeg") {
    return { buffer, contentType, extension: "jpg" };
  }

  if (contentType === "image/webp") {
    return { buffer, contentType, extension: "webp" };
  }

  return { buffer, contentType, extension: "bin" };
}

export async function storeAvatarImage(input: {
  personalityId: string;
  handle: string;
  imageDataUrl: string;
}): Promise<string> {
  const parsed = parseImageDataUrl(input.imageDataUrl);
  const prepared = await prepareAvatarBuffer(parsed.buffer, parsed.contentType);

  return uploadAvatarToPinata({
    personalityId: input.personalityId,
    handle: input.handle,
    buffer: prepared.buffer,
    contentType: prepared.contentType,
    extension: prepared.extension,
  });
}
