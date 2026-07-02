import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { WithChildren } from "./types";
import { cx } from "./utils";

export type IconSize = "sm" | "md" | "lg";

export type IconProps = HTMLAttributes<HTMLSpanElement> &
  WithChildren & {
    size?: IconSize;
  };

export const Icon = forwardRef<HTMLSpanElement, IconProps>(function Icon(
  { children, className, size = "md", ...props },
  ref
) {
  return (
    <span
      ref={ref}
      aria-hidden={props["aria-label"] ? undefined : true}
      data-size={size}
      className={cx("rr-ui-icon", className)}
      {...props}
    >
      {children}
    </span>
  );
});
