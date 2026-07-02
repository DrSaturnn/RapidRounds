import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    loading = false,
    leadingIcon,
    trailingIcon,
    size = "md",
    type = "button",
    variant = "secondary",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      data-loading={loading || undefined}
      data-size={size}
      data-variant={variant}
      disabled={isDisabled}
      type={type}
      className={cx("rr-ui-button", className)}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="rr-ui-button__spinner" /> : null}
      {!loading && leadingIcon ? <span className="rr-ui-button__icon">{leadingIcon}</span> : null}
      {children}
      {!loading && trailingIcon ? <span className="rr-ui-button__icon">{trailingIcon}</span> : null}
    </button>
  );
});
