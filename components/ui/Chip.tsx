import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type ChipVariant = "neutral" | "informational" | "semantic";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
  semanticRole?: string;
  variant?: ChipVariant;
};

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  { children, className, icon, semanticRole, variant = "neutral", ...props },
  ref
) {
  const resolvedVariant = semanticRole ? "semantic" : variant;

  return (
    <span
      ref={ref}
      data-semantic-role={semanticRole}
      data-variant={resolvedVariant}
      className={cx("rr-ui-chip", className)}
      {...props}
    >
      {icon ? <span className="rr-ui-chip__icon">{icon}</span> : null}
      {children}
    </span>
  );
});
