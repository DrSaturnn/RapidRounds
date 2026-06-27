"use client";

import type { ReactNode } from "react";

export function TeachingCard({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="border border-rr-soft-line bg-white transition-colors open:border-rr-line"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
        {title}
      </summary>
      <div className="border-t border-rr-soft-line px-4 py-4 text-sm leading-6">{children}</div>
    </details>
  );
}
