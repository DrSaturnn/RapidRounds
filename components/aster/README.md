# Runtime Aster Components

Use these components for every in-app Aster rendering.

- `Aster.tsx`: canonical avatar component.
- `AsterAssets.ts`: approved runtime asset registry.
- `AsterIcon.tsx`: compact launcher/icon composition.
- `AsterSprite.tsx`: tiny overworld marker.
- `AsterExpressions.ts`: canonical expression names and animation mapping.
- `AsterAnimations.ts`: animation intent registry.
- `AsterTokens.ts`: visual token references from Aster v1.0.

Do not create independent Aster implementations in feature components.

The runtime avatar renders from `public/aster/runtime/neutral.png`.
Component code may scale and lightly animate the approved image, but it must not
redesign the character, crop from documentation sheets, or reconstruct Aster with
CSS geometry.

Pending expression moods must fall back to the approved neutral asset until a
matching approved runtime PNG exists.

Future Aster poses, expressions, icons, sprites, and animations must be rendered
from one rigged Blender model calibrated against
`design-system/aster/canonical/neutral.png`.
