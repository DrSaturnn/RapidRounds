import { createElement, forwardRef } from "react";
import type { ElementType, ForwardedRef, HTMLAttributes } from "react";
import { cx } from "./utils";

export type SurfaceVariant = "card" | "panel" | "dock" | "pill" | "popover" | "inline";

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: SurfaceVariant;
};

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { as: Component = "div", variant = "card", className, ...props },
  ref
) {
  return createElement(Component, {
    ...props,
    ref: ref as ForwardedRef<HTMLElement>,
    "data-variant": variant,
    className: cx("rr-ui-surface", className),
  });
});
