import { Body, Headline, SectionLabel, Surface } from "@/components/ui";
import type { ReactNode } from "react";
import { ClinicalFindingRow } from "./ClinicalFindingRow";
import type { ClinicalFinding } from "./types";

export type PatientWorkspaceProps = {
  actionSlot?: ReactNode;
  answerSlot?: ReactNode;
  className?: string;
  clinicalPattern?: ReactNode;
  findings?: ClinicalFinding[];
  footerSlot?: ReactNode;
  prompt: ReactNode;
  questionLabel?: ReactNode;
  title?: ReactNode;
};

export function PatientWorkspace({
  actionSlot,
  answerSlot,
  className,
  clinicalPattern,
  findings = [],
  footerSlot,
  prompt,
  questionLabel = "Question",
  title = "Recognition Challenge"
}: PatientWorkspaceProps) {
  return (
    <Surface as="section" variant="card" className={["rr-patient-workspace", className].filter(Boolean).join(" ")}>
      <header className="rr-composite-header">
        <SectionLabel>{title}</SectionLabel>
        {clinicalPattern ? <Headline>{clinicalPattern}</Headline> : null}
      </header>

      {findings.length ? (
        <div className="rr-clinical-finding-list" aria-label="Patient findings">
          {findings.map((finding, index) => (
            <ClinicalFindingRow key={finding.id ?? `${finding.text}-${index}`} {...finding} />
          ))}
        </div>
      ) : null}

      <section className="rr-patient-question">
        <SectionLabel>{questionLabel}</SectionLabel>
        <Body>{prompt}</Body>
        {answerSlot ? <div className="rr-patient-answer-slot">{answerSlot}</div> : null}
        {actionSlot ? <div className="rr-patient-action-slot">{actionSlot}</div> : null}
      </section>

      {footerSlot ? <footer className="rr-composite-footer">{footerSlot}</footer> : null}
    </Surface>
  );
}
