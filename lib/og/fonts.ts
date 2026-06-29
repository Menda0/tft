const FONT_URLS: Record<string, string> = {
  "Press Start 2P":
    "https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK0nR.woff",
  "Pixelify Sans":
    "https://fonts.gstatic.com/s/pixelifysans/v3/CHy2V-3HFUT7aC4iv1TxGDR9DHEserHN25py2TTp0H1b.woff",
};

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${url}`);
  }

  return response.arrayBuffer();
}

export async function loadGoogleFont(fontFamily: string): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    family: `${fontFamily.replace(/ /g, "+")}`,
  });
  const css = await fetch(`https://fonts.googleapis.com/css2?${params.toString()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)",
    },
  }).then((response) => response.text());

  const match = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype|woff)'\)/,
  );

  if (match?.[1]) {
    return fetchFont(match[1]);
  }

  const fallback = FONT_URLS[fontFamily];

  if (fallback) {
    return fetchFont(fallback);
  }

  throw new Error(`Failed to load font: ${fontFamily}`);
}

export async function loadBrandFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 400; style: "normal" }[]
> {
  const [heading, body] = await Promise.all([
    loadGoogleFont("Press Start 2P"),
    loadGoogleFont("Pixelify Sans"),
  ]);

  return [
    { name: "Press Start 2P", data: heading, weight: 400, style: "normal" },
    { name: "Pixelify Sans", data: body, weight: 400, style: "normal" },
  ];
}
