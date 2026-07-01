import type { AsterExpression } from "@/components/aster/AsterExpressions";

export type AsterProductionAsset = {
  src: string;
  alt: string;
  approved: boolean;
};

export const ASTER_V1_NEUTRAL_ASSET = "/aster/production/neutral.png";
export const ASTER_UNAPPROVED_EXPRESSION_FALLBACK = "neutral";

const pendingExpressionAsset: AsterProductionAsset = {
  src: ASTER_V1_NEUTRAL_ASSET,
  alt: "Aster",
  approved: false,
};

export const ASTER_PRODUCTION_ASSETS: Record<AsterExpression, AsterProductionAsset> = {
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

export function getAsterProductionAsset(mood: AsterExpression): AsterProductionAsset {
  return ASTER_PRODUCTION_ASSETS[mood] ?? ASTER_PRODUCTION_ASSETS.neutral;
}
