"use client";

import { AsterAvatar } from "@/components/aster/Aster";

export function AsterIcon({ label = "Aster" }: { label?: string }) {
  return (
    <span className="rr-aster-icon">
      <AsterAvatar size="tiny" mood="neutral" animated={false} showShadow={false} />
      <span>{label}</span>
    </span>
  );
}
