"use client";

import { getAsterRuntimeAsset } from "@/components/aster/AsterAssets";
import type { AsterExpression } from "@/components/aster/AsterExpressions";

export type AsterAvatarSize = "tiny" | "small" | "medium";
export type AsterAvatarMood = AsterExpression;

export function AsterAvatar({
  size = "small",
  mood = "neutral",
  animated = true,
  showShadow = true,
  eventKey
}: {
  size?: AsterAvatarSize;
  mood?: AsterAvatarMood;
  animated?: boolean;
  showShadow?: boolean;
  eventKey?: string | null;
}) {
  const asset = getAsterRuntimeAsset(mood);

  return (
    <span
      className={[
        "rr-aster-avatar",
        `rr-aster-avatar-${size}`,
        `rr-aster-mood-${mood}`,
        animated ? "rr-aster-avatar-animated" : "rr-aster-avatar-still",
        showShadow ? "rr-aster-avatar-shadowed" : ""
      ].join(" ")}
      key={eventKey ?? `${size}-${mood}`}
      aria-hidden="true"
    >
      <img
        className="rr-aster-runtime-image"
        src={asset.src}
        alt=""
        draggable={false}
      />
    </span>
  );
}

export { moodFromAsterAnimation } from "@/components/aster/AsterExpressions";
