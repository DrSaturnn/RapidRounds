"use client";

import { AsterAvatar } from "@/components/AsterAvatar";
import { Body, Metadata, Surface } from "@/components/ui";
import type { AsterAvatarMood, AsterAvatarSize } from "@/components/AsterAvatar";
import type { ReactNode } from "react";

export type AsterPresenceProps = {
  actionSlot?: ReactNode;
  className?: string;
  description?: ReactNode;
  mood?: AsterAvatarMood;
  size?: AsterAvatarSize;
  status?: ReactNode;
};

export function AsterPresence({
  actionSlot,
  className,
  description = "Aster is standing by.",
  mood = "neutral",
  size = "small",
  status = "Companion ready"
}: AsterPresenceProps) {
  return (
    <Surface as="aside" variant="popover" className={["rr-aster-presence-shell", className].filter(Boolean).join(" ")}>
      <AsterAvatar mood={mood} size={size} animated showShadow />
      <div className="rr-aster-presence-copy">
        <Metadata>{status}</Metadata>
        <Body>{description}</Body>
      </div>
      {actionSlot ? <div className="rr-aster-presence-actions">{actionSlot}</div> : null}
    </Surface>
  );
}
