# RapidRounds Design Constitution v1.0

RapidRounds is not a dashboard.
RapidRounds is not a question bank.
RapidRounds is not an LMS.
RapidRounds is not ChatGPT with questions.

RapidRounds exists to help medical students think like expert attending physicians while preparing for NBME shelf exams and USMLE Step 2 CK.

Every design decision must reduce cognitive friction.

If a UI element does not improve reasoning, it should not exist.

## Core Principle

One screen.
One decision.
One lesson.

The learner should never wonder where to look next.

## Product Identity

RapidRounds should feel like:

- Apple
- Linear
- Arc Browser
- Raycast
- Apple Notes
- NEJM
- UpToDate
- an attending physician's annotated notebook

RapidRounds should not feel like:

- Jira
- Monday
- Canvas
- Blackboard
- Epic
- enterprise SaaS
- analytics dashboards
- gamified test prep

## Reading Order

The learner experience should follow:

Question
-> Answer
-> Expert reasoning
-> Decision boundary
-> Clinical pearl
-> Teach Me More
-> Next case

Do not expose everything simultaneously.

## Interface States

RapidRounds has two primary learning states:

### Solve State

Visible:

- vignette
- answer input
- submit button

Hidden:

- explanation
- clue annotations
- decision boundary
- Teach Me More
- Next Case

### Learn State

After submission, the vignette remains anchored.

The explanation unfolds around it.

The learner should feel they are still reviewing the same patient.

## Progressive Disclosure

The learner earns information by committing.

Explanations should not appear before submission.

Teach Me More should always be collapsed by default.

Decision Boundary appears only when useful.

Aster appears only when invited.

## Layout Philosophy

The desktop layout is:

Top bar
Sidebar
Notebook workspace

The notebook workspace should occupy approximately 75-80% of the available viewport on desktop.

Do not compress the main learning experience into a narrow centered column.

## Cards

Cards exist only when they represent a distinct cognitive task.

Do not create cards purely for decoration or separation.

When possible, merge adjacent cards into one continuous notebook document.

## Notebook Philosophy

The vignette is the page.

Annotations are margin notes.

Pearls are attending comments.

The interface should feel like an attending physician is reviewing the case beside the learner.

## Typography

Typography carries the interface.

Use large readable vignette text, comfortable body spacing, small annotation labels, and excellent line height.

Do not cram information.

## Theme Inheritance Architecture

RapidRounds is theme-driven. The theme system is a first-class presentation
architecture, not a collection of CSS overrides.

Every present and future UI surface MUST derive its appearance from reusable
theme primitives and tokens. Feature code SHOULD compose primitives; themes
SHOULD define how those primitives look.

The intended workflow is:

```text
New feature
-> Compose existing primitives
-> Active theme renders automatically
```

The prohibited workflow is:

```text
New feature
-> Looks correct in Modern Academic
-> Patch Moleskine
-> Patch Dark Clinical
-> Patch Editorial
```

Themes MAY express material and composition differently when the theme identity
requires it. For example, Modern Academic may render a Panel as a clean academic
card, while Moleskine may render the same primitive as aged notebook paper.
Feature code MUST NOT need to know which theme is active.

Every new UI surface MUST be built from reusable presentation primitives, such
as:

- Page
- Card
- Panel
- Callout
- Sidebar
- Drawer
- Modal
- Table
- Comparison
- Annotation
- Button
- Input
- Badge
- Flow
- Timeline
- NotebookSection
- MarginNote
- Divider
- Toolbar

If a feature introduces a new kind of UI surface, the corresponding primitive
MUST be added to the design system before the feature uses it.

All themes preserve:

- spacing
- component hierarchy
- interaction model
- cognitive workflow

Approved themes:

1. Modern Academic
2. Moleskine Notebook
3. Dark Clinical
4. Editorial Magazine

### Modern Academic

Near-white background.
Clean white surfaces.
Subtle gray borders.
Purple accents.
Professional academic feel.

### Moleskine Notebook

An attending physician's aged clinical notebook.
Integrated notebook spread.
Paper margin/sidebar.
Page depth, ruling, fibers, and lifted edges.
Editorial typography.
Pencil-like annotations.
Premium, expressive, and tactile.
Not parchment, scrapbook, or cartoon.

### Dark Clinical

Dark navy or charcoal.
Muted borders.
Subtle glow.
Readable.
Clinical workstation, not cyberpunk.

### Editorial Magazine

Clean white background.
Restrained serif accents if available.
Beautiful spacing.
Medical journal feel.

## Animation

Animation should teach, not decorate.

Good animation:

- explanation unfolds
- clue annotations fade in
- right panel expands
- collapsed sections open smoothly

Bad animation:

- bouncing buttons
- confetti
- flying cards
- excessive motion

Always respect prefers-reduced-motion.

## Buttons

Every button must be functional, disabled with clear Coming Soon state, or hidden.

Never leave fake controls.

## Aster

Aster is a companion, not a mascot cluttering the screen.

Aster should eventually become a case-aware AI drawer that receives:

- current vignette
- learner answer
- correct answer
- explanation
- pivot clues
- decision boundary
- learner state

Until real chat exists, Aster should open a companion shell only. No fake AI responses.

## Definition of Done

A learner opens RapidRounds.

Within three seconds they know exactly what to do.

They answer.

The interface teaches exactly what they needed.

Nothing more.

Nothing less.

A feature is not complete until it renders correctly in every supported theme
using shared presentation primitives. Theme-specific patches after feature
implementation are design-system failures, not acceptable follow-up work.
