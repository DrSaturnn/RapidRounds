"use client";

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
  const accessory = mood === "reading_map" || mood === "teaching";
  const sparkle = mood === "celebrating" || mood === "happy";
  const cue = mood === "thinking" ? "…" : mood === "sleepy" || mood === "resting" ? "z" : null;

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
      {sparkle ? <span className="rr-aster-sparkles">✦</span> : null}
      {cue ? <span className="rr-aster-cue">{cue}</span> : null}
      <span className="rr-aster-shell-glow" />
      <span className="rr-aster-head">
        <span className="rr-aster-panel rr-aster-panel-top" />
        <span className="rr-aster-panel rr-aster-panel-left" />
        <span className="rr-aster-panel rr-aster-panel-right" />
        <span className="rr-aster-ear rr-aster-ear-left">
          <span />
        </span>
        <span className="rr-aster-ear rr-aster-ear-right">
          <span />
        </span>
        <span className="rr-aster-face">
          <span className="rr-aster-visor-gloss" />
          <span className="rr-aster-eye rr-aster-eye-left" />
          <span className="rr-aster-eye rr-aster-eye-right" />
        </span>
      </span>
      <span className="rr-aster-body">
        <span className="rr-aster-torso-panel" />
        <span className="rr-aster-arm rr-aster-arm-left">
          <span className="rr-aster-hand" />
        </span>
        <span className="rr-aster-arm rr-aster-arm-right">
          <span className="rr-aster-hand" />
        </span>
        <span className="rr-aster-core">
          <span />
        </span>
        <span className="rr-aster-foot rr-aster-foot-left" />
        <span className="rr-aster-foot rr-aster-foot-right" />
      </span>
      {accessory ? (
        <span className={`rr-aster-accessory rr-aster-accessory-${mood}`}>
          <span />
        </span>
      ) : null}
      {showShadow ? <span className="rr-aster-shadow" /> : null}
    </span>
  );
}

export { moodFromAsterAnimation } from "@/components/aster/AsterExpressions";
