# Aster Design System

This folder is the canonical source for Aster's visual identity.

Aster is RapidRounds' expedition companion. He represents learner progress,
curiosity, persistence, and calm support. He is not a chatbot, mascot, helper
widget, or decorative character.

## Canonical Assets

- `canonical_front.png`
- `canonical_side.png`
- `canonical_3qtr.png`
- `expression_sheet.png`
- `proportions.png`
- `color_palette.png`

These images are treated as product specifications. Implementation should match
their silhouette, proportions, materials, and emotional tone as closely as the
current rendering technology allows.

## Runtime Components

Runtime code must use the shared Aster components in:

```text
components/aster/
```

Do not create independent Aster renderings elsewhere.

## Quality Gate

Before shipping an Aster change, compare the runtime component against the
canonical sheets for:

- rounded white ceramic shell
- deep glossy black visor
- warm amber LED eyes
- champagne metallic side accents
- glowing amber chest crystal
- compact floating posture
- subtle expression changes through the eyes
- small, supportive presence
