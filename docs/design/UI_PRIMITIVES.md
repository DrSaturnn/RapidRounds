# RapidRounds UI Primitives

Phase 2C establishes the foundational visual primitives. These components are
generic building blocks. They do not know about clinical reasoning, questions,
learners, Aster, or any specific RapidRounds screen.

All primitives consume the canonical token layer defined in
`app/globals.css` and exposed through `tailwind.config.ts`.

## Surface

Purpose: provide the canonical container material for every future UI surface.

Variants:

- `card`
- `panel`
- `dock`
- `pill`
- `popover`
- `inline`

Props:

- `variant`
- `as`
- `className`
- all native element attributes, including ARIA attributes

Example:

```tsx
import { Surface } from "@/components/ui";

<Surface as="section" variant="card" aria-label="Example surface">
  Content
</Surface>
```

## Button

Purpose: provide the canonical interactive command primitive.

Variants:

- `primary`
- `secondary`
- `ghost`
- `quiet`
- `icon`

Sizes:

- `sm`
- `md`
- `lg`

States:

- default
- hover
- pressed
- disabled
- loading
- focus-visible

Props:

- `variant`
- `size`
- `loading`
- `leadingIcon`
- `trailingIcon`
- all native `button` attributes

Example:

```tsx
import { Button } from "@/components/ui";

<Button variant="primary" size="md">
  Continue
</Button>
```

## Chip

Purpose: provide compact metadata and semantic role labels.

Variants:

- `neutral`
- `informational`
- `semantic`

Semantic roles:

- `pattern`
- `supporting`
- `pivot`
- `learner`
- `expert`
- `overlap`
- `discriminator`
- `repair`
- `commit`
- `noise`

Props:

- `variant`
- `semanticRole`
- `icon`
- all native `span` attributes

Example:

```tsx
import { Chip } from "@/components/ui";

<Chip semanticRole="pivot">
  Pivot
</Chip>
```

## TextInput and TextArea

Purpose: provide accessible text entry surfaces with canonical glass treatment.

Props:

- `label`
- `hideLabel`
- `description`
- `error`
- all native input or textarea attributes

Example:

```tsx
import { TextInput } from "@/components/ui";

<TextInput
  label="Answer"
  placeholder="Type your answer"
/>
```

## Typography

Purpose: provide canonical text hierarchy without hardcoded sizes.

Components:

- `Display`
- `Title`
- `Headline`
- `SectionLabel`
- `Body`
- `BodyStrong`
- `Metadata`
- `Caption`

Props:

- `as`
- `className`
- native text element attributes

Example:

```tsx
import { Headline, Body } from "@/components/ui";

<Headline>Section title</Headline>
<Body>Supporting text belongs to the caller.</Body>
```

## Icon

Purpose: standardize icon sizing and alignment. Icons inherit color from their
parent and do not encode semantic meaning.

Sizes:

- `sm`
- `md`
- `lg`

Props:

- `size`
- `className`
- all native `span` attributes

Example:

```tsx
import { Icon } from "@/components/ui";

<Icon size="md">
  <SomeIcon />
</Icon>
```

## Architectural Rule

Future screen-specific components should compose these primitives before adding
new presentation treatment. If a needed visual pattern cannot be expressed with
these primitives, extend the primitive layer first.

## Clinical Composite Boundary

Clinical composites live outside `components/ui`. They may compose primitives
and shared types, but they must not introduce educational engine, routing,
grading, persistence, adaptive, or workflow ownership.

Narrow exception: `AsterPresence` may import the canonical `AsterAvatar` visual
asset because Aster is a product identity asset rather than a clinical reasoning
component. This exception applies only to `AsterPresence`.

`AsterAvatar` must stay presentational. It must not own medical reasoning,
session state, grading, routing, adaptive logic, persistence, or workflow
behavior. No other clinical composite may import arbitrary non-UI components
without design-system review.

The canonical runtime Aster visual is the GLB asset at
`/public/assets/aster/aster_v1.glb`, rendered by `AsterAvatar3D` behind the
public `AsterAvatar` wrapper. This renderer may own only visual concerns:
lazy-loading, Suspense fallback, lighting, camera framing, subtle idle motion,
and reduced-motion behavior.
