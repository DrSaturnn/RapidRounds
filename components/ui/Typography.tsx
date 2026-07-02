import { createElement, forwardRef } from "react";
import type { ElementType, ForwardedRef, HTMLAttributes } from "react";
import { cx } from "./utils";

type TypographyElement = HTMLElement;

type TypographyProps = HTMLAttributes<TypographyElement> & {
  as?: ElementType;
};

function createTypography(defaultElement: ElementType, className: string) {
  return forwardRef<TypographyElement, TypographyProps>(function Typography(
    { as: Component = defaultElement, className: providedClassName, ...props },
    ref
  ) {
    return createElement(Component, {
      ...props,
      ref: ref as ForwardedRef<TypographyElement>,
      className: cx(className, providedClassName),
    });
  });
}

export const Display = createTypography("h1", "rr-ui-type rr-ui-type-display");
export const Title = createTypography("h2", "rr-ui-type rr-ui-type-title");
export const Headline = createTypography("h3", "rr-ui-type rr-ui-type-headline");
export const SectionLabel = createTypography("p", "rr-ui-type rr-ui-type-section-label");
export const Body = createTypography("p", "rr-ui-type rr-ui-type-body");
export const BodyStrong = createTypography("strong", "rr-ui-type rr-ui-type-body-strong");
export const Metadata = createTypography("p", "rr-ui-type rr-ui-type-metadata");
export const Caption = createTypography("p", "rr-ui-type rr-ui-type-caption");
