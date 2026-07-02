import { Body, BodyStrong, SectionLabel, Surface } from "@/components/ui";
import type { ReactNode } from "react";

export type CommitCardProps = {
  className?: string;
  rule: ReactNode;
  takeaways?: ReactNode[];
  title?: ReactNode;
};

export function CommitCard({ className, rule, takeaways = [], title = "Commit To Memory" }: CommitCardProps) {
  return (
    <Surface as="section" variant="card" className={["rr-commit-card", className].filter(Boolean).join(" ")}>
      <SectionLabel>{title}</SectionLabel>
      <BodyStrong className="rr-commit-rule">{rule}</BodyStrong>
      {takeaways.length ? (
        <ul className="rr-commit-takeaways">
          {takeaways.map((takeaway, index) => (
            <li key={index}>
              <Body>{takeaway}</Body>
            </li>
          ))}
        </ul>
      ) : null}
    </Surface>
  );
}
