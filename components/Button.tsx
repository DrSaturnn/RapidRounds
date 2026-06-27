import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className = "", variant = "primary", ...props },
  ref
) {
  const variantClass = {
    primary: "rr-button-primary",
    secondary: "rr-button-secondary",
    ghost: "rr-button-ghost",
    destructive: "rr-button-destructive"
  }[variant];

  return (
    <button
      ref={ref}
      className={`rr-button ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rr-button rr-button-primary"
    >
      {children}
    </Link>
  );
}
