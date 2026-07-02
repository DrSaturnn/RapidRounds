import { Chip } from "@/components/ui";
import type { ComponentPropsWithoutRef } from "react";
import type { ReasoningRole } from "./types";

export const SEMANTIC_ROLE_LABELS: Record<ReasoningRole, string> = {
  pattern: "Pattern",
  supporting: "Supporting",
  pivot: "Pivot",
  learner: "Learner schema",
  expert: "Expert schema",
  overlap: "Shared overlap",
  discriminator: "Discriminator",
  repair: "Decision repair",
  commit: "Commit rule",
  noise: "Noise"
};

export type SemanticChipProps = Omit<ComponentPropsWithoutRef<typeof Chip>, "role" | "semanticRole"> & {
  role: ReasoningRole;
};

export function SemanticChip({ children, role, ...props }: SemanticChipProps) {
  return (
    <Chip semanticRole={role} {...props}>
      {children ?? SEMANTIC_ROLE_LABELS[role]}
    </Chip>
  );
}
