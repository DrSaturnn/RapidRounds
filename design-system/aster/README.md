# Aster Design System

This folder is the canonical source for Aster's visual identity.

Aster is RapidRounds' expedition companion. He represents learner progress,
curiosity, persistence, and calm support. He is not a chatbot, mascot, helper
widget, or decorative character.

## Locked Canonical Character

`canonical/neutral.png` is Aster v1.0 and the single source of truth for the
character.

Runtime code renders approved app-facing exports from:

```text
public/aster/runtime/neutral.png
```

Do not use documentation sheets, crops, CSS reconstructions, or generated
variations as runtime assets.

Future poses, expressions, icons, sprites, and animations must be rendered from
a single rigged Blender model calibrated against `canonical/neutral.png`. They
must be recorded in `runtime/asset_manifest.json` before use in the app.

## Runtime Components

Runtime code must use the shared Aster components in:

```text
components/aster/
```

Do not create independent Aster renderings elsewhere.

## Quality Gate

Before shipping an Aster change, compare the runtime component against
`canonical/neutral.png` for:

- rounded white ceramic shell
- deep glossy black visor
- warm amber LED eyes
- champagne metallic side accents
- glowing amber chest crystal
- compact floating posture
- subtle expression changes through the eyes
- small, supportive presence
