import { Body, Headline, SectionLabel, Surface } from "@/components/ui";
import type { ReactNode } from "react";

export type ReasoningWorkspaceStage = {
  id: string;
  title: ReactNode;
  body?: ReactNode;
  content?: ReactNode;
};

export type ReasoningWorkspaceProps = {
  children?: ReactNode;
  className?: string;
  placeholder?: ReactNode;
  stages?: ReasoningWorkspaceStage[];
  title?: ReactNode;
};

export function ReasoningWorkspace({
  children,
  className,
  placeholder = "Submit your answer. Aster will walk you through the expert reasoning.",
  stages = [],
  title = "Reasoning Workspace"
}: ReasoningWorkspaceProps) {
  const hasContent = Boolean(children) || stages.length > 0;

  return (
    <Surface
      as="aside"
      variant="panel"
      className={["rr-reasoning-composite-workspace", !hasContent ? "rr-reasoning-composite-empty" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="rr-composite-header">
        <SectionLabel>{title}</SectionLabel>
      </header>

      {stages.length ? (
        <div className="rr-reasoning-stage-list">
          {stages.map((stage, index) => (
            <Surface as="section" variant="inline" className="rr-reasoning-stage-card" key={stage.id}>
              <span className="rr-reasoning-stage-index">{index + 1}</span>
              <div>
                <Headline as="h3">{stage.title}</Headline>
                {stage.body ? <Body>{stage.body}</Body> : null}
                {stage.content}
              </div>
            </Surface>
          ))}
        </div>
      ) : null}

      {children}

      {!hasContent ? <Body className="rr-reasoning-placeholder-copy">{placeholder}</Body> : null}
    </Surface>
  );
}
