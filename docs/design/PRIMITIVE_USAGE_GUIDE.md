# RapidRounds Primitive Usage Guide

This guide protects the Phase 2C primitive layer before semantic composites are
built on top of it.

## Core Rule

Primitive components are domain-agnostic. They provide material, typography,
interaction, and sizing behavior only. They must not contain curriculum,
medical, learner-state, Aster, tutor, or question-flow logic.

## Allowed In `components/ui`

- `Surface`
- `Button`
- `TextInput`
- `TextArea`
- `Chip`
- `Icon`
- Typography primitives such as `Display`, `Title`, `Headline`, `SectionLabel`,
  `Body`, `Metadata`, and `Caption`
- Small utility types and class-merging helpers

## Forbidden In `components/ui`

Do not add domain-specific components to the primitive layer, including:

- `QuestionCard`
- `ClinicalCard`
- `ReasoningCard`
- `CommitCard`
- `PatientCard`
- `ClinicalFinding`
- `ClinicalFindingRow`
- `SemanticChip`
- `PivotChip`
- `DiscriminatorTable`
- `PatientWorkspace`
- `ReasoningWorkspace`
- `RecognitionChallenge`
- `AsterPresence`

These belong in a future semantic/composite layer that composes primitives.

## Dependency Direction

Correct:

```text
Composite component
  -> Surface
  -> Typography
  -> Chip
  -> Button
```

Incorrect:

```text
Primitive component
  -> Clinical reasoning component
  -> Curriculum or tutor data
```

Primitives must never import from application routes, curriculum engines,
learner state, tutor logic, generated cases, ontology objects, or Aster session
state.

## Semantic Roles

`Chip` may receive `semanticRole` because the Human Interface Guidelines define
reasoning-role color tokens. The primitive does not interpret those roles as
medical behavior; it only passes the token name to CSS.

Use:

```tsx
<Chip semanticRole="pivot">Pivot</Chip>
```

Do not create primitive wrappers such as:

```tsx
<PivotChip />
<ExpertSchemaChip />
```

Those wrappers belong in the composite layer.

## Surface

`Surface` is a generic material primitive. It may render different semantic HTML
elements with `as`, but its `variant` values must remain presentation-only:

- `card`
- `panel`
- `dock`
- `pill`
- `popover`
- `inline`

Do not add variants such as `question`, `commit`, `pivot`, or `diagnosis`.

## Typography

Typography primitives own font family, size, weight, line height, tracking, and
color defaults. They must not own layout spacing. Compose spacing through parent
layout, stacks, grids, or explicit caller classes.

## Icons

`Icon` owns only size, alignment, and accessibility defaults. It must not encode
semantic roles. Apply color through parent text color, a semantic `Chip`, or a
future composite component.

## Accessibility Defaults

Primitives should preserve:

- `forwardRef`
- keyboard focus styling
- native element attributes
- labels and descriptions for form controls
- `type="button"` for buttons unless explicitly overridden
- `aria-busy` for loading buttons
- reduced-motion compatibility through tokenized motion

## Class Merging

Use the shared class merge helper for primitive class composition. Avoid manual
string concatenation in primitive components.

## Phase 2D Boundary

Phase 2D may introduce semantic composites such as `PatientWorkspace`,
`ClinicalFindingRow`, `DiscriminatorTable`, and `CommitCard`. Those components
must compose the primitives documented here and must not push domain logic back
down into `components/ui`.

### Narrow AsterPresence Exception

`AsterPresence` may depend on the canonical `AsterAvatar` visual asset because
Aster is a product identity asset, not a clinical reasoning component. This
exception is allowed only for `AsterPresence`.

`AsterAvatar` must remain presentational only. It must not own medical
reasoning, session state, grading, routing, adaptive logic, persistence, or
workflow behavior.

`AsterAvatar` may render the canonical runtime GLB asset through the dedicated
`AsterAvatar3D` renderer. The GLB path is a product identity asset path, not
application state. Loading, lighting, idle hover, reduced-motion handling, and
fallback display are allowed inside the avatar renderer because they are visual
presentation concerns only.

No other clinical composite may import arbitrary non-UI components without
explicit design-system review.
