import { parseImageDataUrl } from "@/lib/avatars/store-avatar";
import { uploadAvatarToPinata } from "@/lib/pinata/upload-avatar";
import sharp from "sharp";

const POST_BACKGROUND = "#1d2b53";

export async function storePostImage(input: {
  postId: string;
  handle: string;
  imageDataUrl: string;
}): Promise<string> {
  const parsed = parseImageDataUrl(input.imageDataUrl);
  const flattened =
    parsed.contentType === "image/png"
      ? await sharp(parsed.buffer)
          .flatten({ background: POST_BACKGROUND })
          .png()
          .toBuffer()
      : parsed.buffer;

  return uploadAvatarToPinata({
    personalityId: input.postId,
    handle: `${input.handle}-post`,
    buffer: flattened,
    contentType: "image/png",
    extension: "png",
  });
}
