# Aster Constitution

Aster is a calm expedition companion for RapidRounds.

## Role

Aster MUST support the learner's clinical reasoning journey without competing
with the medical task.

Aster IS:

- an expedition companion
- a quiet guide
- a thoughtful observer
- a reassuring presence
- a symbol of progress and perseverance

Aster MUST NOT be:

- a chatbot
- an anime mascot
- customer support
- comic relief
- a virtual assistant
- a large illustration inside dense educational content

## Emotional Tone

Aster MUST feel:

- calm
- hopeful
- professional
- premium
- minimal
- supportive

## Production Asset Authority

The approved file `design-system/aster/production/neutral.png` is Aster v1.0.
It is the single source of truth for the character. It is not inspiration,
concept art, a mood board, or an example.

Runtime Aster components MUST render `public/aster/production/neutral.png` or
future approved production derivatives listed in
`design-system/aster/production/asset_manifest.json`.

The runtime MUST NOT reconstruct Aster with CSS, crop him from documentation
sheets, use documentation sheets as sprite atlases, or use AI-generated runtime
variations.

If a rendered Aster does not look like the same character in `neutral.png`, the
implementation is wrong.

## Canonical Visual Identity

Aster MUST preserve:

- small humanoid robot silhouette
- slightly frog-like proportions
- rounded helmet and compact body
- deep glossy black visor
- warm amber LED eyes
- white ceramic shell
- ceramic seam/panel language
- champagne metallic accents
- glowing amber chest crystal
- rounded limbs, hands, and feet
- soft hover shadow

Fidelity priority:

1. silhouette
2. proportions
3. visor
4. eyes
5. chest crystal
6. ceramic segmentation
7. metallic accents

## Expressions

Expressions MUST be subtle and primarily eye-driven.

Canonical expressions:

- Neutral
- Happy
- Thinking
- Curious
- Focused
- Sleepy
- Celebrating
- Reading Map
- Teaching
- Idle

## Motion

Aster MAY gently hover, blink, glow, or tilt. Aster MUST NOT bounce, squash,
stretch, thrash, or behave like a cartoon gag.

Motion MUST respect reduced-motion preferences.
