import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className = "", variant = "primary", ...props },
  ref
) {
  const variantClass =
    variant === "primary"
      ? "border-black bg-black text-white hover:bg-white hover:text-black"
      : "border-black bg-white text-black hover:bg-black hover:text-white";

  return (
    <button
      ref={ref}
      className={`inline-flex h-11 items-center justify-center border px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-500 ${variantClass} ${className}`}
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
      className="inline-flex h-11 items-center justify-center border border-black bg-black px-5 text-sm font-medium text-white transition hover:bg-white hover:text-black"
    >
      {children}
    </Link>
  );
}
