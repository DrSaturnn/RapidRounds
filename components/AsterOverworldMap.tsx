"use client";

import { AsterAvatar, moodFromAsterAnimation } from "@/components/aster/Aster";
import type { AsterCompanionState } from "@/lib/aster-companion";

const MAP_NODE_POSITIONS = [
  { x: 18, y: 72 },
  { x: 31, y: 63 },
  { x: 44, y: 67 },
  { x: 55, y: 52 },
  { x: 68, y: 49 },
  { x: 79, y: 36 },
  { x: 66, y: 27 },
  { x: 52, y: 31 },
  { x: 40, y: 23 },
  { x: 27, y: 31 }
];

function pathForNodes(nodes: Array<{ x: number; y: number }>) {
  if (!nodes.length) return "";
  return nodes
    .map((node, index) => `${index === 0 ? "M" : "L"} ${node.x} ${node.y}`)
    .join(" ");
}

export function AsterOverworldMap({
  completed,
  target,
  outcome,
  animationState,
  eventKey
}: {
  completed: number;
  target: number;
  outcome: AsterCompanionState["session"]["routeOutcome"];
  animationState: AsterCompanionState["session"]["animationState"];
  eventKey: string | null;
}) {
  const visibleTarget = Math.max(1, Math.min(target, MAP_NODE_POSITIONS.length));
  const nodes = MAP_NODE_POSITIONS.slice(0, visibleTarget);
  const currentIndex = Math.min(Math.max(completed, 0), visibleTarget - 1);
  const completedIndex = Math.max(0, Math.min(completed - 1, visibleTarget - 1));
  const completedPath = pathForNodes(nodes.slice(0, completed > 0 ? completedIndex + 1 : 1));
  const fullPath = pathForNodes(nodes);
  const currentNode = nodes[currentIndex];
  const goalNode = nodes[nodes.length - 1];
  const showReviewRoute = outcome === "review_route";
  const showShortcut = outcome === "shortcut";

  return (
    <div className={`rr-aster-overworld rr-aster-overworld-${outcome}`} aria-label="Aster expedition route">
      <svg className="rr-aster-overworld-svg" viewBox="0 0 100 92" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="rr-aster-path" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--rr-aster-path-a)" />
            <stop offset="100%" stopColor="var(--rr-aster-path-b)" />
          </linearGradient>
        </defs>
        <rect className="rr-aster-map-ground" x="3" y="5" width="94" height="82" rx="14" />
        <circle className="rr-aster-map-hill" cx="22" cy="24" r="8" />
        <circle className="rr-aster-map-hill" cx="71" cy="73" r="10" />
        <path className="rr-aster-map-water" d="M4 73 C18 65 28 86 42 76 C54 68 62 82 77 74 C86 69 91 75 97 71 L97 87 L4 87 Z" />
        <path className="rr-aster-map-path rr-aster-map-path-base" d={fullPath} />
        <path className="rr-aster-map-path rr-aster-map-path-complete" d={completedPath} />
        {showShortcut ? <path className="rr-aster-map-shortcut" d={`M ${nodes[1]?.x ?? 28} ${nodes[1]?.y ?? 61} Q 52 6 ${goalNode.x} ${goalNode.y}`} /> : null}
        {showReviewRoute ? <path className="rr-aster-map-review" d={`M ${currentNode.x} ${currentNode.y} Q 42 86 19 82`} /> : null}
        {nodes.map((node, index) => {
          const isComplete = index < completed;
          const isCurrent = index === currentIndex;
          const isGoal = index === nodes.length - 1;
          return (
            <g key={`${node.x}-${node.y}`} className={[
              "rr-aster-map-node",
              isComplete ? "rr-aster-map-node-complete" : "",
              isCurrent ? "rr-aster-map-node-current" : "",
              isGoal ? "rr-aster-map-node-goal" : ""
            ].join(" ")}>
              <circle cx={node.x} cy={node.y} r={isCurrent ? 4.5 : 3.5} />
              {isGoal ? <text x={node.x} y={node.y + 1.8} textAnchor="middle">★</text> : null}
            </g>
          );
        })}
        <text className="rr-aster-map-label" x="10" y="15">Start</text>
        <text className="rr-aster-map-label" x={Math.max(64, goalNode.x - 4)} y={Math.max(13, goalNode.y - 9)}>Goal</text>
      </svg>
      <span
        className="rr-aster-map-avatar"
        style={{
          left: `${currentNode.x}%`,
          top: `${currentNode.y}%`
        }}
      >
        <AsterAvatar
          size="tiny"
          mood={moodFromAsterAnimation(animationState)}
          animated
          showShadow
          eventKey={eventKey}
        />
      </span>
      <div className="rr-aster-map-legend">
        <span>{completed} / {target}</span>
        {showShortcut ? <em>Shortcut path</em> : null}
        {showReviewRoute ? <em>Review route</em> : null}
      </div>
    </div>
  );
}
