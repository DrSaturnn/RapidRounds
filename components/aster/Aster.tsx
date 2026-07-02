"use client";

import dynamic from "next/dynamic";

import { AsterAvatarFallback } from "@/components/aster/AsterAvatarFallback";
import type { AsterExpression } from "@/components/aster/AsterExpressions";

export type AsterAvatarSize = "tiny" | "small" | "medium";
export type AsterAvatarMood = AsterExpression;

export type AsterAvatarProps = {
  size?: AsterAvatarSize;
  mood?: AsterAvatarMood;
  animated?: boolean;
  showShadow?: boolean;
  eventKey?: string | null;
};

const LazyAsterAvatar3D = dynamic(
  () => import("@/components/aster/AsterAvatar3D").then((module) => module.AsterAvatar3D),
  {
    ssr: false,
    loading: () => <AsterAvatarFallback size="small" mood="neutral" animated showShadow />,
  }
);

export function AsterAvatar({
  size = "small",
  mood = "neutral",
  animated = true,
  showShadow = true,
  eventKey
}: AsterAvatarProps) {
  return (
    <LazyAsterAvatar3D
      key={eventKey ?? `${size}-${mood}`}
      size={size}
      mood={mood}
      animated={animated}
      showShadow={showShadow}
    />
  );
}

export { moodFromAsterAnimation } from "@/components/aster/AsterExpressions";
