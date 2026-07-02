# RapidRounds Human Interface Guidelines v1

This document is the canonical interface contract for RapidRounds. It captures
the design system reverse engineered from the approved product mockups and the
Human Interface Review Board critique.

RapidRounds is a clinical reasoning workspace. Its interface must help learners
compare the patient evidence, the learner's activated schema, the expert schema,
and the pivot that separates them.

## Design Principles

- Patient First: the patient vignette remains visible and stable throughout
  reasoning.
- Reasoning Over Answering: the interface teaches schema activation, pivot
  recognition, and discriminator reasoning.
- Semantic Color, Not Judgment: color describes the role of information in
  reasoning, not moral correctness.
- Aster Supports, Never Leads: Aster is a companion status presence, not a
  chatbot or the owner of medical reasoning.
- Glass as System, Not Decoration: glass surfaces are tokenized primitives.

## Layout System

Mobile is a single-column narrative. The page owns scroll, uses safe-area
padding, and keeps the bottom dock persistent.

Desktop is a fixed clinical workspace. The shell should not vertically scroll.
The Patient Workspace and Reasoning Workspace may scroll independently. The
Patient Workspace occupies roughly 44-48% of the main area; the Reasoning
Workspace occupies roughly 48-54%.

Tablet collapses to the mobile narrative until the viewport comfortably supports
two panes.

## Surface System

All visible containers derive from `Surface`.

- `Surface.Card`: main content cards.
- `Surface.Panel`: reasoning panes and side panels.
- `Surface.Pill`: subject selectors, progress chips, semantic chips.
- `Surface.Dock`: bottom navigation and persistent controls.
- `Surface.Popover`: menus, selectors, and companion panels.
- `Surface.Inline`: inputs and compact rows.

No new surface style should be created outside the Surface system.

The implemented primitive reference lives in
[`UI_PRIMITIVES.md`](UI_PRIMITIVES.md).

## Token Architecture

The CSS variable layer is the single source of truth.

Canonical token namespaces:

- Surfaces: `--rr-surface-*`
- Glass: `--rr-glass-*`
- Text: `--rr-text-*-canonical` and `--rr-text-secondary`
- Typography: `--rr-type-*`
- Semantic reasoning roles: `--rr-semantic-*`
- Interaction states: `--rr-state-*`
- Spacing: `--rr-space-0`, `--rr-space-4`, `--rr-space-8`, `--rr-space-12`,
  `--rr-space-16`, `--rr-space-20`, `--rr-space-24`, `--rr-space-32`,
  `--rr-space-40`, `--rr-space-48`, `--rr-space-64`
- Radius: `--rr-radius-token-*`
- Elevation: `--rr-elevation-*`
- Motion: `--rr-motion-*` and `--rr-ease-*`

Compatibility aliases such as `--rr-bg`, `--rr-surface`, `--rr-text`,
`--rr-radius-md`, and `--rr-color-pivot` may remain only to support existing
components. New implementation must consume the canonical namespaces above.

The token cascade is:

Canonical Tokens -> Compatibility Aliases -> Tailwind -> Components

There must not be a parallel legacy token source of truth.

## Typography System

Canonical text styles:

- Display: 34px / 1.08 / 700.
- Title: 28px / 1.12 / 700.
- Headline: 20px / 1.25 / 650.
- SectionLabel: 12px / 1.2 / 750 / 0.04em uppercase.
- Body: 16px / 1.45 / 450.
- BodyStrong: 16px / 1.4 / 650.
- Metadata: 13px / 1.3 / 550.
- Caption: 12px / 1.3 / 500.
- Chip: 12px / 1.2 / 650.
- Button: 15px / 1.2 / 650.

## Semantic Color System

Semantic role colors are not UI state colors. They must remain separate from
hover, focus, pressed, selected, disabled, and loading tokens.

Reasoning roles:

- Pattern
- Supporting
- Pivot
- Learner
- Expert
- Overlap
- Discriminator
- Repair
- Commit
- Noise

No component may hardcode semantic reasoning colors.

## Interaction States

Every interactive component must support default, hover, pressed, focus,
disabled, and loading states where applicable.

## Core Components

- `ClinicalFindingRow`: one patient clue with optional post-answer semantic role.
- `SemanticChip`: text-bearing semantic role indicator.
- `PatientWorkspace`: recognition challenge, clue lines, question prompt, answer.
- `ReasoningWorkspace`: pre-answer placeholder and post-answer staged reasoning.
- `DiscriminatorTable`: expert schema vs learner activated schema comparison.
- `CommitCard`: compressed high-signal memory rule.
- `AsterPresence`: companion state, never medical reasoning ownership.

## Motion System

Motion is calm, deliberate, and supportive. Pre-answer to post-answer keeps the
patient stable while semantic chips and reasoning panels reveal. Reduced motion
must remove transforms and preserve opacity changes only.

## Accessibility

Semantic chips must include readable text. The pivot cannot be identified by
color alone. Discriminator tables require accessible headers and mobile
alternatives. Aster is decorative unless conveying session state.

## Drift Prevention Rules

1. No new surface style without extending `Surface`.
2. No hardcoded semantic colors.
3. No dashboard cards in Rapid Round flow.
4. No punitive red/green answer styling.
5. No Aster redesign or expansion into tutor/chat.
6. No hiding patient context after answer submission.
7. No reasoning card before learner commitment.
8. No desktop document-scroll layout.
9. No mobile split-pane layout.
10. No unlabeled color-only semantic indicators.

## Canonical Root Abstractions

The design system is governed by five root abstractions:

1. `Surface`
2. `SemanticRole`
3. `ClinicalFinding`
4. `PatientWorkspace`
5. `ReasoningWorkspace`

Everything else composes from those primitives.
