import {
  BRAND_ACCENT,
  BRAND_BG,
  BRAND_FOREGROUND,
  BRAND_HIGHLIGHT,
  BRAND_MUTED,
  BRAND_PRIMARY,
  BRAND_SHADOW,
  BRAND_SUCCESS,
  PROJECT_NAME,
  PROJECT_NAME_BADGE,
  PROJECT_TAGLINE,
} from "@/lib/brand";

type BrandCardProps = {
  width: number;
  height: number;
  variant: "icon" | "apple" | "og";
};

function IconMark({ size }: { size: number }) {
  const inset = Math.round(size * 0.18);
  const dot = Math.max(2, Math.round(size * 0.12));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_BG,
      }}
    >
      <div
        style={{
          width: size - inset * 2,
          height: size - inset * 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: Math.max(1, Math.round(dot * 0.5)),
          background: BRAND_FOREGROUND,
          border: `${Math.max(1, Math.round(size * 0.06))}px solid ${BRAND_SHADOW}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: dot,
          }}
        >
          <div
            style={{
              width: dot,
              height: dot,
              display: "flex",
              background: BRAND_ACCENT,
            }}
          />
          <div
            style={{
              width: dot,
              height: dot,
              display: "flex",
              background: BRAND_SUCCESS,
            }}
          />
          <div
            style={{
              width: dot,
              height: dot,
              display: "flex",
              background: BRAND_PRIMARY,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            width: Math.round(size * 0.42),
            height: Math.max(2, Math.round(size * 0.08)),
            background: BRAND_MUTED,
          }}
        />
      </div>
    </div>
  );
}

function PhoneBadge({ scale }: { scale: number }) {
  const border = Math.max(2, Math.round(2 * scale));
  const pad = Math.round(8 * scale);
  const badgeSize = Math.round(10 * scale);
  const speakerW = Math.round(32 * scale);
  const speakerH = Math.max(4, Math.round(6 * scale));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: BRAND_FOREGROUND,
        border: `${border}px solid ${BRAND_SHADOW}`,
        boxShadow: `${Math.round(4 * scale)}px ${Math.round(4 * scale)}px 0 ${BRAND_SHADOW}`,
        padding: pad,
        gap: Math.round(6 * scale),
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            display: "flex",
            border: `${Math.max(1, border - 1)}px solid ${BRAND_SHADOW}`,
            background: BRAND_ACCENT,
          }}
        />
        <div
          style={{
            width: speakerW,
            height: speakerH,
            display: "flex",
            border: `${Math.max(1, border - 1)}px solid ${BRAND_BG}`,
            background: BRAND_MUTED,
          }}
        />
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            border: `${Math.max(1, border - 1)}px solid ${BRAND_SHADOW}`,
            background: BRAND_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: Math.round(5 * scale),
              height: Math.round(5 * scale),
              display: "flex",
              borderRadius: "50%",
              background: BRAND_MUTED,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: Math.round(3 * scale),
        }}
      >
        {[0, 1, 2].map((dot) => (
          <div
            key={dot}
            style={{
              width: Math.round(4 * scale),
              height: Math.round(4 * scale),
              display: "flex",
              background: BRAND_SUCCESS,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          fontFamily: "Press Start 2P",
          fontSize: Math.max(6, Math.round(8 * scale)),
          color: BRAND_HIGHLIGHT,
          letterSpacing: Math.round(2 * scale),
        }}
      >
        {PROJECT_NAME_BADGE}
      </div>
    </div>
  );
}

export function BrandCard({ width, height, variant }: BrandCardProps) {
  if (variant === "icon") {
    return <IconMark size={width} />;
  }

  const scale = variant === "apple" ? 1.2 : 2.4;
  const shadowOffset = variant === "og" ? 12 : Math.max(3, Math.round(4 * scale));

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_BG,
        position: "relative",
      }}
    >
      {variant === "og" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            padding: 64,
          }}
        >
          <PhoneBadge scale={scale} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Press Start 2P",
                fontSize: 42,
                color: BRAND_HIGHLIGHT,
                lineHeight: 1.4,
                maxWidth: 900,
              }}
            >
              {PROJECT_NAME}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Pixelify Sans",
                fontSize: 28,
                color: BRAND_FOREGROUND,
                lineHeight: 1.5,
                maxWidth: 820,
              }}
            >
              {PROJECT_TAGLINE}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            {[BRAND_PRIMARY, BRAND_ACCENT, BRAND_SUCCESS, BRAND_HIGHLIGHT].map(
              (color) => (
                <div
                  key={color}
                  style={{
                    width: 16,
                    height: 16,
                    display: "flex",
                    background: color,
                    border: `2px solid ${BRAND_SHADOW}`,
                  }}
                />
              ),
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PhoneBadge scale={scale} />
        </div>
      )}

      {variant === "og" ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 24,
            border: `4px solid ${BRAND_FOREGROUND}`,
            boxShadow: `${shadowOffset}px ${shadowOffset}px 0 ${BRAND_SHADOW}`,
          }}
        />
      ) : null}
    </div>
  );
}
