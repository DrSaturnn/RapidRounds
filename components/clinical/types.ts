import type { ReactNode } from "react";

export type ReasoningRole =
  | "pattern"
  | "supporting"
  | "pivot"
  | "learner"
  | "expert"
  | "overlap"
  | "discriminator"
  | "repair"
  | "commit"
  | "noise";

export type ClinicalFinding = {
  id?: string;
  text: string;
  detail?: string;
  icon?: ReactNode;
  role?: ReasoningRole;
  roleLabel?: string;
};

export type DiscriminatorRow = {
  feature: string;
  expert: ReactNode;
  learner: ReactNode;
  role?: Extract<ReasoningRole, "pivot" | "overlap" | "discriminator" | "noise">;
};
