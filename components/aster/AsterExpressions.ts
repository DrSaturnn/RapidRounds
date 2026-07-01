export const ASTER_EXPRESSIONS = [
  "neutral",
  "happy",
  "thinking",
  "curious",
  "focused",
  "sleepy",
  "celebrating",
  "reading_map",
  "teaching",
  "idle",
  "resting",
] as const;

export type AsterExpression = (typeof ASTER_EXPRESSIONS)[number];

export function moodFromAsterAnimation(animationState?: string): AsterExpression {
  if (animationState === "walking") return "happy";
  if (animationState === "thinking") return "thinking";
  if (animationState === "reading_map") return "reading_map";
  if (animationState === "celebrating") return "celebrating";
  if (animationState === "resting") return "resting";
  if (animationState === "idle") return "idle";
  return "neutral";
}
