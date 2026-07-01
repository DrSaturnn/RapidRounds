# Aster Design System

This folder is the canonical source for Aster's visual identity.

Aster is RapidRounds' expedition companion. He represents learner progress,
curiosity, persistence, and calm support. He is not a chatbot, mascot, helper
widget, or decorative character.

## Locked Production Asset

`production/neutral.png` is Aster v1.0 and the single source of truth for the
character.

Runtime code renders the public copy at:

```text
public/aster/production/neutral.png
```

Do not use documentation sheets, crops, CSS reconstructions, or generated
variations as runtime assets.

Future production assets must follow `production/PIPELINE.md` and be recorded
in `production/asset_manifest.json`.

## Runtime Components

Runtime code must use the shared Aster components in:

```text
components/aster/
```

Do not create independent Aster renderings elsewhere.

## Quality Gate

Before shipping an Aster change, compare the runtime component against
`production/neutral.png` for:

- rounded white ceramic shell
- deep glossy black visor
- warm amber LED eyes
- champagne metallic side accents
- glowing amber chest crystal
- compact floating posture
- subtle expression changes through the eyes
- small, supportive presence
