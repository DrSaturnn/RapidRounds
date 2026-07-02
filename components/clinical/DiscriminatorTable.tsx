import { BodyStrong, SectionLabel, Surface } from "@/components/ui";
import type { ReactNode } from "react";
import { SemanticChip } from "./SemanticChip";
import type { DiscriminatorRow } from "./types";

export type DiscriminatorTableProps = {
  boardRule?: ReactNode;
  className?: string;
  expertLabel: ReactNode;
  learnerLabel: ReactNode;
  rows: DiscriminatorRow[];
  title?: ReactNode;
};

export function DiscriminatorTable({
  boardRule,
  className,
  expertLabel,
  learnerLabel,
  rows,
  title = "Discriminator Table"
}: DiscriminatorTableProps) {
  return (
    <Surface as="section" variant="panel" className={["rr-discriminator-composite", className].filter(Boolean).join(" ")}>
      <header className="rr-composite-header">
        <SectionLabel>{title}</SectionLabel>
      </header>
      <div className="rr-discriminator-table-wrap">
        <table className="rr-discriminator-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">
                <SemanticChip role="expert">{expertLabel}</SemanticChip>
              </th>
              <th scope="col">
                <SemanticChip role="learner">{learnerLabel}</SemanticChip>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr data-role={row.role} key={row.feature}>
                <th scope="row">
                  {row.role ? <SemanticChip role={row.role}>{row.feature}</SemanticChip> : row.feature}
                </th>
                <td>{row.expert}</td>
                <td>{row.learner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {boardRule ? (
        <p className="rr-discriminator-board-rule">
          <BodyStrong as="span">Board rule</BodyStrong>
          {boardRule}
        </p>
      ) : null}
    </Surface>
  );
}
