# Aster v1.0 Production Asset Pipeline

`neutral.png` is Aster v1.0. It is the single source of truth for the
character.

## Locked Source

- Source file: `design-system/aster/production/neutral.png`
- Runtime copy: `public/aster/production/neutral.png`
- Status: approved and locked

## Forbidden

- Do not redraw Aster in CSS.
- Do not crop runtime assets from documentation sheets.
- Do not use documentation sheets as sprite atlases.
- Do not generate runtime variants with AI.
- Do not ship unapproved poses, expressions, or sprites.

## Model Sheet Requirement

Future production poses must look like the same physical character rotated in
space. Required model sheet assets:

- `Front.png`
- `ThreeQuarterFront.png`
- `Side.png`
- `ThreeQuarterBack.png`
- `Back.png`
- `Top.png`

These assets must preserve the locked identity attributes in
`asset_manifest.json`.

## Expression Requirement

Only after the model sheet is approved, create expression assets:

- `idle.png`
- `thinking.png`
- `curious.png`
- `focused.png`
- `happy.png`
- `celebrating.png`
- `sleepy.png`
- `reading-map.png`
- `teaching.png`
- `exploring.png`

Each expression must appear to be the same physical robot photographed seconds
apart.

## Sprite Requirement

Sprites must be translated from approved production assets:

- `16x16`
- `24x24`
- `32x32`

Sprites must preserve silhouette, visor, eye glow, chest crystal, and ceramic
body proportions as far as the pixel grid allows.
