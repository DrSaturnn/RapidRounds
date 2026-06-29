# RapidRounds System Specification V1

This document defines implementation contracts for RapidRounds. It is intended
for future Codex sessions and implementation agents.

For product laws, see [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md). For
knowledge architecture, see
[KNOWLEDGE_ARCHITECTURE_V1.md](KNOWLEDGE_ARCHITECTURE_V1.md). For prohibited
patterns, see [ANTI_PATTERNS.md](ANTI_PATTERNS.md).

## 1. Canonical Data Flow

RapidRounds runtime systems MUST follow this conceptual flow:

```text
KnowledgeObject
-> ClinicalReasoningNode / ShelfSchemaNode
-> GeneratedCase
-> RapidRoundsReasoningObject
-> PracticeSession
-> Renderer
```

Medical generation logic MUST NOT live inside React components.

## 2. Object Responsibilities

### KnowledgeObject

Owns durable medical concept information, public validation references, common
traps, related concepts, and source policy metadata.

### ClinicalReasoningNode / ShelfSchemaNode

Owns the specific NBME-style reasoning task. It determines the pivot clue,
decision boundary, semantic links, answer type, tier eligibility, management
stage, and variant strategy.

### GeneratedCase

Owns the original case text produced from a schema node. It is runtime content,
not the durable source of truth.

### RapidRoundsReasoningObject

Owns renderer-safe semantic teaching data:

- learner answer, when available
- learner answer schema
- correct schema
- pivot clue
- semantic links
- intended discriminator pair
- clinical resolution
- teaching pearl
- next-time rule

### PracticeSession

Owns the learner's current training state, answer submission state, selected
subject, selected mode, breadth level, and current case.

### Renderer

Owns presentation only. It renders the semantic object and session state. It
MUST NOT infer medical relationships, grade answers, generate cases, or mutate
the curriculum graph.

## 3. Ownership Boundaries

The following ownership boundaries MUST be preserved:

- Answer evaluation belongs in the evaluation engine.
- Curriculum generation belongs in schema and case-generation modules.
- Adaptive selection belongs in adaptive and learner-state services.
- Tutor content assembly belongs in tutor/education modules.
- Theme and layout belong in presentation primitives and renderers.
- Database persistence belongs in Prisma-backed API routes and persistence
  services.

React components MAY request state and render state. They MUST NOT own medical
truth or curriculum construction.

## 4. Allowed Dependencies

Schema and generation modules MAY depend on:

- subject seed registries
- public blueprint metadata
- guideline-reference metadata
- local deterministic helpers
- `RapidRoundsReasoningObject` builders

Practice API routes MAY depend on:

- persistence services
- learner state
- adaptive selection
- generated-case caches
- answer evaluation
- tutor content assembly

Renderers MAY depend on:

- typed DTOs
- semantic view models
- theme primitives
- local display helpers

## 5. Forbidden Dependencies

The following dependencies are forbidden:

- React components importing case generation functions.
- React components importing schema seed registries for medical logic.
- Renderers computing correctness.
- Renderers inventing semantic links.
- CSS or theme files encoding medical decisions.
- Adaptive selection depending on visible UI labels.
- Knowledge acquisition storing proprietary source expressions.
- Database schema changes for temporary rendering convenience.

## 6. Caching And Performance Rules

Runtime practice selection MUST be cheap.

The system SHOULD:

- build curriculum indexes once per process
- memoize schema nodes by subject
- memoize generated case pools by subject and breadth
- memoize schema-node case pools by schema node and breadth
- use lightweight counts for subject dropdowns
- resolve generated case ids without generating all subjects
- avoid rebuilding `RapidRoundsReasoningObject` unless the selected case changes

The system MUST NOT:

- regenerate all cases during render
- regenerate all subjects to display the subject dropdown
- rebuild the full curriculum graph on every next-case request
- perform broad generated-case scans when a stable case id can resolve the
  schema node directly

Development builds MAY expose timing logs for:

- subject registry build time
- schema-node derivation time
- generated case pool time
- next-case selection time
- generated case counts by subject and breadth

## 7. Subject Dropdown Behavior

The primary subject dropdown MUST show only high-level learner-facing subjects:

- Internal Medicine
- Surgery
- OB/GYN
- Pediatrics
- Psychiatry
- Family Medicine
- Emergency Medicine
- Neurology
- Ethics
- Biostatistics

The dropdown MUST NOT expose systems, topics, decision trees, or schema nodes in
the default UI.

Subject counts SHOULD be lightweight and truthful. They MUST NOT require full
case generation merely to render the menu.

Unavailable subjects, if any, MUST be disabled or omitted. They MUST NOT be
fake-clickable.

## 8. Case-Tier Selection Behavior

Learner-facing modes SHOULD remain simple:

- Adaptive
- New Concepts
- Weak Areas
- Review
- Rapid Round
- Comprehensive

Internal mode selection MAY map to:

- subject
- shelf
- breadth level
- schema-node tier
- adaptive priority
- learner state

Core NBME cases SHOULD power high-yield and fast-practice modes. Comprehensive
cases SHOULD power breadth, review-all, advanced, and full-shelf modes.

The UI MUST NOT require normal learners to choose schema nodes directly.

## 9. Renderer Contracts

Renderers MUST consume semantic DTOs and view models.

Post-answer teaching SHOULD render in this sequence when data is available:

1. learner schema sentence
2. schema arrow chain
3. pivot clue
4. semantic bridge
5. discriminator table
6. clinical resolution
7. next-time rule

Renderers MAY vary visual treatment by theme. They MUST preserve semantic order
and MUST NOT change grading, adaptive logic, or medical content.

Theme-specific renderers MAY exist when the presentation model requires it, but
they MUST consume the same semantic contracts.

## 10. Learner State Contracts

Learner state MUST be scoped to the anonymous learner id until a future auth
system exists.

Progress records SHOULD preserve:

- question or clinical decision id
- learner answer
- expected answer
- correctness and classification
- partial credit
- confidence, when available
- cognitive error or reasoning pattern, when available
- repair type
- timestamp
- decision type
- topic or concept
- curriculum node id, when available
- shelf and discipline tags, when available

Learner state SHOULD influence adaptive selection conservatively. It MUST NOT
expose another learner's progress.

Cognitive error labels SHOULD remain internal unless explicitly transformed
into learner-facing coaching language.

## 11. Adaptive Selection Contract

Adaptive selection SHOULD consume:

- learner state
- completed decisions
- recent misses
- repeated reasoning patterns
- curriculum relationships
- schema-node tier
- subject and mode

Adaptive selection MUST preserve a safe fallback when learner state is empty.
It MUST prefer incomplete decisions when alternatives exist.

Adaptive selection MUST NOT require dashboards, manual topic-tree traversal, or
full graph exposure.

## 12. Chrome Extension / Knowledge Acquisition Boundary

The Chrome extension and Knowledge Acquisition Engine are ingestion boundaries,
not runtime renderers.

They MAY extract or propose:

- source type
- question archetype
- clinical schema
- pivots
- answer choices as transient parsing input
- educational objective
- incorrect-answer discriminators
- confidence and review status

They MUST NOT store proprietary stems, answer choices, rationales, or
source-specific item expression as RapidRounds source content.

The renderer MUST NOT care whether semantic fields came from local reasoning,
extension ingestion, public seed metadata, or future AI. It receives a
normalized semantic object.

## 13. Source Policy Contract

RapidRounds MAY store generalized medical reasoning structures and original
case outputs.

Every durable knowledge object or schema node SHOULD identify whether it is:

- reconstructed from public medical truth
- validated by public sources
- free of retained proprietary expression

If confidence is low, the system SHOULD mark content for expert review rather
than hallucinating missing medical relationships.

## 14. Testing Contract

Tests SHOULD cover:

- schema-node required fields
- generated-case validity
- Core versus Comprehensive filtering
- discriminator pairs
- semantic links
- post-answer teaching fields
- learner isolation
- cache behavior
- renderer independence from medical generation
- absence of proprietary source expression

Regression tests SHOULD be added whenever a prior architectural drift is fixed.

## 15. Modification Rule

Future changes SHOULD extend the existing data flow. If a change requires a new
parallel path, it MUST justify why the existing flow cannot represent the
behavior.

No implementation task should bypass this specification by placing medical
generation, grading, or adaptive logic in presentation code.
