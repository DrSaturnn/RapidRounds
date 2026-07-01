# Runtime Aster Components

Use these components for every in-app Aster rendering.

- `Aster.tsx`: canonical avatar component.
- `AsterAssets.ts`: production asset sheet coordinates and crop metadata.
- `AsterIcon.tsx`: compact launcher/icon composition.
- `AsterSprite.tsx`: tiny overworld marker.
- `AsterExpressions.ts`: canonical expression names and animation mapping.
- `AsterAnimations.ts`: animation intent registry.
- `AsterTokens.ts`: visual token references from the canonical sheet.

Do not create independent Aster implementations in feature components.

The runtime avatar renders from `public/aster/canonical-aster-sheet.png`.
Component code may scale, crop, and lightly animate that asset, but it must not
redesign the character with new geometry.
