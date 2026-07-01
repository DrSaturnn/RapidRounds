"use client";

import {
  ASTER_EXPRESSION_REGIONS,
  getAsterRegionStyle
} from "@/components/aster/AsterAssets";
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
  const region = ASTER_EXPRESSION_REGIONS[mood] ?? ASTER_EXPRESSION_REGIONS.neutral;

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
      style={getAsterRegionStyle(region)}
      aria-hidden="true"
    >
      <span className="rr-aster-canonical-sprite" />
    </span>
  );
}

export { moodFromAsterAnimation } from "@/components/aster/AsterExpressions";
