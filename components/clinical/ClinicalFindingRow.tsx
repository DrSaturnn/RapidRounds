import { Icon, Metadata, Surface } from "@/components/ui";
import type { HTMLAttributes } from "react";
import { SemanticChip } from "./SemanticChip";
import type { ClinicalFinding } from "./types";

export type ClinicalFindingRowProps = Omit<HTMLAttributes<HTMLDivElement>, "role"> & ClinicalFinding;

export function ClinicalFindingRow({
  className,
  detail,
  icon,
  role,
  roleLabel,
  text,
  ...props
}: ClinicalFindingRowProps) {
  return (
    <Surface
      as="div"
      variant="inline"
      className={["rr-clinical-finding-row", role ? `rr-clinical-finding-row-${role}` : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon ? (
        <Icon size="md" className="rr-clinical-finding-icon">
          {icon}
        </Icon>
      ) : null}
      <div className="rr-clinical-finding-copy">
        <span className="rr-clinical-finding-text">{text}</span>
        {detail ? <Metadata as="span">{detail}</Metadata> : null}
      </div>
      {role ? <SemanticChip role={role}>{roleLabel}</SemanticChip> : null}
    </Surface>
  );
}
