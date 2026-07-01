# ADR: Clinical Reasoning Graph Layer

Status: Accepted

Date: 2026-07-01

## Decision

RapidRounds will keep the Clinical Knowledge Ontology as the durable knowledge
layer and add a separate Clinical Reasoning Graph as the executable reasoning
layer.

The smallest computational primitive capable of representing expert clinical
reasoning is a pivot-weighted discriminating transition:

```text
activated clinical pattern
-> candidate schema
-> pivot clue
-> semantic relationship
-> competing schema pruned or confirmed
-> commitment rule
```

This primitive is smaller than a disease, illness script, schema, question, or
decision node. A schema describes what can be true. A discriminating transition
describes what an expert does when a cue changes the active branch of reasoning.

## 1. Current Architecture

The current architecture already contains the pieces of this split, but the
responsibilities are not yet fully separated.

- `lib/curriculum-acquisition.ts` normalizes educational sources into
  `KnowledgeObject` records.
- `lib/anking-enrichment.ts` preserves AnKing material as supporting factual
  enrichment and source references.
- `lib/clinical-reasoning-ontology.ts` derives ontology entries with canonical
  schemas, NBME surface terms, pivot clues, competing schemas, repair operations,
  commit rules, and source references.
- `lib/ontology-benchmark.ts` evaluates whether ontology entries reconstruct
  benchmark clinical reasoning cases.
- `lib/local-reasoning-engine.ts` builds `RapidRoundsReasoningObject` data for
  generated cases.
- `lib/reasoning-engine.ts`, `lib/educational-assembly.ts`, and
  `lib/tutor-content.ts` perform runtime reasoning, repair classification, and
  tutor content assembly.
- `components/TutorMode.tsx` renders the semantic post-answer teaching contract.

This means RapidRounds currently has a declarative ontology and multiple
runtime reasoning surfaces, but no single executable reasoning graph primitive.

## 2. Strengths

The ontology layer is strong as a knowledge system.

- It separates canonical schema identity from NBME surface language.
- It preserves answer-choice and source wording as aliases rather than schema
  structure.
- It normalizes bundled answer-choice artifacts into real clinical competitors.
- It stores pivot clues, discriminator relationships, common misactivations,
  repair operations, commit rules, and retrieval prompts.
- It preserves source references without letting AnKing or CMS-derived material
  overwrite reasoning truth.
- It is benchmarkable through curated cases.

The current tutor and local reasoning objects are strong as renderer contracts.

- They already expose learner schema, correct schema, pivot clue, semantic
  links, intended discriminator pair, clinical resolution, and next-time rule.
- Renderers can consume semantic fields without inventing medical relationships.

## 3. Weaknesses

The ontology alone does not naturally execute expert reasoning.

- It stores possible pivots and competitors but does not model traversal through
  candidate branches.
- It does not represent the active learner branch versus the expert branch.
- It does not score or weight competing schemas as evidence accumulates.
- It does not encode the exact transition where a learner's reasoning diverged.
- It cannot distinguish "schema exists" from "schema was activated, challenged,
  pruned, and committed."
- It cannot yet express when a pivot supports one branch while ruling out a
  neighboring branch as an executable operation.

The runtime reasoning code is fragmented.

- `lib/reasoning-engine.ts` classifies broad reasoning errors from answer text.
- `lib/educational-assembly.ts` chooses repair modules from error categories.
- `lib/tutor-content.ts` assembles teaching content from decision metadata.
- `lib/local-reasoning-engine.ts` creates semantic case objects.

These modules are useful, but none is the durable executable representation of
expert clinical reasoning.

## 4. Missing Abstractions

RapidRounds needs explicit objects for:

- active schema state
- competing schema state
- evidence-weighted pivot transition
- expert branch
- learner branch
- branch divergence
- schema pruning
- commitment threshold or rule
- repair operation as a transformation from learner branch to expert branch

These are computational reasoning objects, not knowledge objects.

## 5. Candidate Architectures

### Option A: Make The Ontology Executable

The ontology entry would grow until it can model traversal, evidence weighting,
learner state, commitment, and repair.

Benefits:

- Fewer top-level concepts.
- Less initial plumbing.
- Existing benchmark can continue to target the same object.

Costs:

- The ontology becomes a mixed persistence, knowledge, and runtime state object.
- Source-derived facts risk becoming tangled with learner-specific reasoning.
- Future AI reasoning, simulation, and adaptive scheduling would have to mutate
  or reinterpret static ontology records.
- It becomes harder to tell whether a field is durable medical truth or runtime
  reasoning state.

### Option B: Add A Separate Clinical Reasoning Graph

The ontology remains the declarative knowledge layer. A graph layer derives
executable transitions and traces from ontology entries.

Benefits:

- Clear distinction between what is medically true and what the expert reasoner
  does with it.
- Better cognitive fidelity: reasoning is represented as branch activation,
  pivot transition, competing-schema pruning, and commitment.
- Better benchmarkability: tests can separately score ontology quality and
  reasoning traversal quality.
- Better future AI integration: AI can propose or critique transitions without
  overwriting source knowledge.
- Better maintainability: tutor, adaptive selection, and learner modeling can
  consume the same reasoning traces over time.

Costs:

- Adds a new architectural layer.
- Requires migration work before tutor and scheduler fully benefit.
- Requires discipline to prevent graph fields from drifting into duplicate
  ontology fields.

### Option C: Replace Deterministic Reasoning With An AI Tutor

An AI layer would interpret ontology entries and learner answers at runtime.

Benefits:

- Flexible language generation.
- Potentially strong handling of unseen edge cases.

Costs:

- Less deterministic and harder to benchmark.
- Higher risk of hallucinated medical relationships.
- Conflicts with RapidRounds' need for stable NBME-style decision boundaries.
- Does not solve the need for a durable executable reasoning representation.

## 6. Tradeoffs

Option B adds a small amount of architecture now to prevent the ontology from
becoming a god object. The cost is one derived graph layer. The benefit is a
stable place to model expert cognition without corrupting durable medical
knowledge or renderer contracts.

This is the best tradeoff for educational correctness, cognitive fidelity,
maintainability, extensibility, future AI integration, and benchmarkability.

## 7. Recommended Architecture

RapidRounds should use two distinct but connected layers.

### Layer 1: Clinical Knowledge Ontology

Responsible for:

- canonical schemas
- illness scripts
- NBME surface terminology
- pivot clues
- supporting and noise clues
- discriminator relationships
- competing schemas
- repair knowledge
- commit rules
- retrieval prompts
- source references and supporting facts

This layer answers:

```text
What medical reasoning knowledge exists?
```

### Layer 2: Clinical Reasoning Graph

Responsible for:

- active schema traversal
- pivot-weighted transitions
- competing schema pruning
- learner branch versus expert branch
- divergence detection
- commitment rule execution
- repair generation input

This layer answers:

```text
What did the expert reasoner do with the available clues?
Where did the learner's branch diverge?
What is the smallest repair that moves the learner back to the expert branch?
```

The first graph primitive is `ClinicalReasoningTransition`, derived from an
ontology entry. A transition must describe:

- the clinical pattern being reasoned through
- the activated schema
- the pivot clue
- the semantic relationship
- the competing schema being supported or pruned
- the likely learner divergence
- the repair operation
- the commit rule

## 8. Migration Strategy

Migration should be incremental.

1. Add a headless graph module that derives reasoning traces from ontology
   entries.
2. Add tests proving that graph traces represent pivot transitions, competing
   schema pruning, learner divergence, and commit rules.
3. Extend the ontology benchmark later so it can evaluate both ontology quality
   and graph traversal quality.
4. Gradually allow tutor assembly to consume graph traces for post-answer
   teaching.
5. Gradually allow adaptive scheduling to consume graph-level competencies
   instead of topic or diagnosis repetition.
6. Keep CAE and AnKing pipelines writing durable knowledge only.

No existing tutor, grading, persistence, or curriculum generation behavior
should be rewritten for this first migration step.

## 9. Risks

- The graph could duplicate ontology fields instead of deriving executable
  transitions from them.
- The graph could become too elaborate before tutor and scheduler consume it.
- Transition confidence could be mistaken for medical truth if source references
  are not preserved.
- Benchmarks could overfit to curated cases unless future tests include noisy
  CAE output and learner-answer scenarios.

Mitigations:

- Keep the initial graph layer derived and read-only.
- Do not mutate ontology entries from graph operations.
- Preserve source ontology schema ids on every transition.
- Keep rendering and grading independent until graph behavior is validated.

## 10. Future Extensibility

The Clinical Reasoning Graph can support:

- learner-versus-expert path comparison
- adaptive scheduling by reasoning competency
- decision-boundary repair that follows explicit graph transitions
- AI critique of missing or weak transitions
- oral-board style reasoning simulation
- cross-shelf transfer cases
- management progression through staged clinical states
- benchmark scoring of divergence detection and repair operations

The ontology remains the source of durable medical truth. The graph becomes the
source of executable expert reasoning.

## Final Self-Review

An experienced physician should recognize that the architecture models the
moment a pivot clue changes the differential, not just a list of facts.

A medical educator should recognize that repair can target the learner's branch
divergence rather than merely explaining the correct answer.

A software architect should recognize separate persistence, reasoning, and
rendering responsibilities.

An AI researcher should recognize a stable symbolic substrate that future AI can
use, critique, or enrich without becoming the source of truth.

Therefore, this architecture models expert clinical reasoning more faithfully
than a fact ontology alone.
