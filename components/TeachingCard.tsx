"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function TeachingCard({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean | "desktop";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen === true);

  useEffect(() => {
    if (defaultOpen !== "desktop") {
      setIsOpen(defaultOpen);
      return;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const syncOpenState = () => setIsOpen(media.matches);

    syncOpenState();
    media.addEventListener("change", syncOpenState);

    return () => media.removeEventListener("change", syncOpenState);
  }, [defaultOpen]);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className="rr-card rr-teaching-card rr-explanation-card rr-card-paper overflow-hidden transition-colors open:border-rr-memory"
    >
      <summary className="rr-panel-collapsed cursor-pointer list-none px-4 py-3 text-sm font-semibold sm:px-5">
        {title}
      </summary>
      <div className="border-t border-rr-soft-line px-4 py-4 text-sm leading-6 sm:px-5">{children}</div>
    </details>
  );
}
