# Aster Canonical Character Constitution

Aster v1.0 is defined by `canonical/neutral.png`.

This image is the immutable character reference. It is not a concept sketch,
style reference, mood board, or prompt input. It defines the character identity
that all future model renders, expression sheets, sprites, icons, and runtime
assets MUST preserve.

## Source Of Truth

The canonical character source is:

```text
design-system/aster/canonical/neutral.png
```

Future Aster production should be rendered from a single rigged Blender model
that is calibrated against this canonical image. New poses or expressions MUST
look like the same physical character photographed from another angle or at
another moment.

## Immutable Identity

Aster MUST preserve:

- head size
- helmet geometry
- visor proportions
- eye shape
- eye spacing
- eye glow
- ceramic shell segmentation
- body proportions
- very short stubby arms
- leg proportions
- chest crystal
- material response
- lighting response
- hover shadow style
- overall silhouette
- calm, curious, supportive personality

## Derivative Asset Rule

Future assets MAY include orthographic views, expression renders, animation
frames, sprites, and icons. They MUST be derived from the same approved Aster
model. They MUST NOT be independently regenerated, redrawn, reinterpreted, or
approximated with CSS.

## Runtime Rule

Runtime components MUST consume approved exports from `design-system/aster/runtime`
and `public/aster/runtime`. Runtime code MUST treat Aster as one character with
one identity, not as a collection of unrelated images.
