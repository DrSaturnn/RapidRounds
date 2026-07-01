"use client";

import { AsterAvatar, type AsterAvatarMood } from "@/components/aster/Aster";

export function AsterSprite({
  mood = "neutral",
  animated = true,
}: {
  mood?: AsterAvatarMood;
  animated?: boolean;
}) {
  return <AsterAvatar size="tiny" mood={mood} animated={animated} showShadow />;
}
