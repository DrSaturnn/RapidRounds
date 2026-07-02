"use client";

import { getAsterRuntimeAsset } from "@/components/aster/AsterAssets";
import type { AsterAvatarMood, AsterAvatarSize } from "@/components/aster/Aster";

export function AsterAvatarFallback({
  size = "small",
  mood = "neutral",
  animated = true,
  showShadow = true,
}: {
  size?: AsterAvatarSize;
  mood?: AsterAvatarMood;
  animated?: boolean;
  showShadow?: boolean;
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
