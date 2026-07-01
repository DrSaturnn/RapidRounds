import type { AsterExpression } from "@/components/aster/AsterExpressions";

export type AsterRuntimeAsset = {
  src: string;
  alt: string;
  approved: boolean;
};

export const ASTER_V1_NEUTRAL_ASSET = "/aster/runtime/neutral.png";
export const ASTER_UNAPPROVED_EXPRESSION_FALLBACK = "neutral";

const pendingExpressionAsset: AsterRuntimeAsset = {
  src: ASTER_V1_NEUTRAL_ASSET,
  alt: "Aster",
  approved: false,
};

export const ASTER_RUNTIME_ASSETS: Record<AsterExpression, AsterRuntimeAsset> = {
  neutral: {
    src: ASTER_V1_NEUTRAL_ASSET,
    alt: "Aster neutral",
    approved: true,
  },
  happy: pendingExpressionAsset,
  thinking: pendingExpressionAsset,
  curious: pendingExpressionAsset,
  focused: pendingExpressionAsset,
  sleepy: pendingExpressionAsset,
  celebrating: pendingExpressionAsset,
  reading_map: pendingExpressionAsset,
  teaching: pendingExpressionAsset,
  idle: pendingExpressionAsset,
  resting: pendingExpressionAsset,
};

export function getAsterRuntimeAsset(mood: AsterExpression): AsterRuntimeAsset {
  return ASTER_RUNTIME_ASSETS[mood] ?? ASTER_RUNTIME_ASSETS.neutral;
}
