import type { AsterExpression } from "@/components/aster/AsterExpressions";
import type { CSSProperties } from "react";

export const ASTER_CANONICAL_SHEET = "/aster/canonical-aster-sheet.png";

export const ASTER_CANONICAL_SHEET_SIZE = {
  width: 1402,
  height: 1122,
} as const;

export type AsterAssetRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const ASTER_EXPRESSION_REGIONS: Record<AsterExpression, AsterAssetRegion> = {
  neutral: { x: 454, y: 58, width: 122, height: 148 },
  happy: { x: 617, y: 58, width: 122, height: 148 },
  thinking: { x: 780, y: 58, width: 122, height: 148 },
  curious: { x: 943, y: 58, width: 122, height: 148 },
  focused: { x: 1106, y: 58, width: 122, height: 148 },
  sleepy: { x: 454, y: 236, width: 122, height: 148 },
  celebrating: { x: 617, y: 236, width: 122, height: 148 },
  reading_map: { x: 760, y: 236, width: 170, height: 148 },
  teaching: { x: 936, y: 236, width: 160, height: 148 },
  idle: { x: 1106, y: 236, width: 122, height: 148 },
  resting: { x: 454, y: 236, width: 122, height: 148 },
};

export function getAsterRegionStyle(region: AsterAssetRegion) {
  const xRange = ASTER_CANONICAL_SHEET_SIZE.width - region.width;
  const yRange = ASTER_CANONICAL_SHEET_SIZE.height - region.height;
  const backgroundPositionX = xRange > 0 ? (region.x / xRange) * 100 : 0;
  const backgroundPositionY = yRange > 0 ? (region.y / yRange) * 100 : 0;

  return {
    "--rr-aster-sheet": `url(${ASTER_CANONICAL_SHEET})`,
    "--rr-aster-sheet-size": `${(ASTER_CANONICAL_SHEET_SIZE.width / region.width) * 100}% ${(ASTER_CANONICAL_SHEET_SIZE.height / region.height) * 100}%`,
    "--rr-aster-sheet-position": `${backgroundPositionX}% ${backgroundPositionY}%`,
    "--rr-aster-aspect": `${region.width} / ${region.height}`,
  } as CSSProperties;
}
