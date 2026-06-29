# RapidRounds Anti-Patterns

This document lists implementation and product behaviors RapidRounds MUST
avoid. It is a companion to [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md),
[KNOWLEDGE_ARCHITECTURE_V1.md](KNOWLEDGE_ARCHITECTURE_V1.md), and
[SYSTEM_SPECIFICATION_V1.md](SYSTEM_SPECIFICATION_V1.md).

Anti-patterns are not preferences. They are known sources of architectural
drift, educational dilution, or product mistrust.

## 1. Generating Questions Directly From Diseases

Do not generate practice cases directly from a parent disease or topic as the
primary architecture.

Wrong:

```text
heart failure -> question
appendicitis -> question
depression -> question
```

Right:

```text
KnowledgeObject
-> ShelfSchemaNode
-> GeneratedCase
```

A disease may have many NBME-style reasoning schemas. Those schemas, not the
parent disease, MUST be the generation unit.

## 2. Shallow Clue-Swapping

Do not create breadth by swapping isolated clues while preserving the same
question.

Shallow variation makes RapidRounds feel repetitive and teaches stem
recognition rather than reasoning transfer.

Breadth MUST come from:

- distinct schema nodes
- distinct variant types
- management state changes
- meaningful discriminator shifts
- complication branches
- contraindication branches
- pertinent-negative emphasis

## 3. Teaching The Correct Answer Before The Learner Schema

Post-answer teaching MUST NOT default to answer-key explanation.

The preferred teaching move is:

```text
learner schema
-> pivot clue
-> decision boundary
-> clinical resolution
```

The learner should understand what schema they activated before being told only
that the correct answer was different.

## 4. Guessing Semantic Links In The UI

Renderers MUST NOT infer semantic links from displayed text.

Wrong:

```text
React scans the vignette and decides what the pivot proves.
```

Right:

```text
engine emits SemanticLink[]
renderer displays SemanticLink[]
```

If semantic links are missing, the renderer should omit the bridge or show a
safe fallback. It must not hallucinate.

## 5. Exposing Internal Schema Graphs To Normal Users

Do not make normal learners choose systems, topics, subtopics, decision trees,
or schema nodes in the primary UI.

The primary learner choice should remain high-level:

- subject
- session mode
- breadth, when appropriate

Advanced graph exploration MAY exist behind an advanced/debug surface, but it
MUST NOT become the default training flow.

## 6. Regenerating Curriculum During Render

React render paths MUST NOT regenerate:

- subject registries
- schema nodes
- generated cases
- reasoning objects
- adaptive queues

Rendering should consume already-selected semantic state.

## 7. Putting Medical Logic In Components

Components MUST NOT own:

- answer grading
- accepted-answer matching
- case generation
- curriculum graph construction
- decision-boundary logic
- cognitive error classification
- semantic link construction
- adaptive selection

Components may render, collect input, and dispatch actions. Medical logic
belongs in engine modules.

## 8. Creating Dashboard / SaaS-Style UI

RapidRounds MUST NOT drift into dashboard-first product design.

Avoid:

- analytics widgets in the primary practice path
- gamified streak panels as the central screen
- cluttered sidebars
- SaaS-style management consoles
- decorative controls that do not support reasoning
- fake buttons or fake navigation

The primary experience is training.

## 9. Copying Proprietary Question-Bank Content

RapidRounds MUST NOT copy proprietary stems, answer choices, explanations,
rationales, tables, or item-specific fact patterns from commercial or protected
question banks.

Allowed:

- public medical truth
- standard terminology
- public guideline relationships
- public blueprint categories
- original RapidRounds case text
- generalized clinical reasoning schemas

Forbidden:

- copied stems
- copied answer options
- copied rationales
- copied educational-objective prose
- near-duplicate item reconstruction
- source-specific expression

## 10. Storing External Bank Stems, Choices, Or Rationales

Knowledge acquisition MAY use external highlighted content as transient parsing
input when permitted by workflow, but durable RapidRounds storage MUST NOT keep
the proprietary expression.

Store reconstructed reasoning structures, not source text.

## 11. Rendering Generic Filler As Teaching

Do not show placeholder educational text such as:

- Different operation
- Different next best step
- Surface-level overlap
- Missing or misreading that clue
- The stem would need the defining clue
- Do not switch answers unless

If a comparison is not clinically specific, omit it.

## 12. Treating Unknown As Wrong Reasoning

Blank, pass, unsure, and similar unknown responses MUST NOT be treated as
decision errors.

Unknown state should trigger concept-building, not wrong-answer repair.

## 13. Exposing Raw Cognitive Labels As Default Teaching

Cognitive error labels are useful for analytics and adaptation. They MUST NOT
be the default learner-facing explanation.

Convert them to coaching language when useful.

Wrong:

```text
Cognitive Error: Premature Closure
```

Better:

```text
You stopped one step too early.
```

## 14. Making Shelves Into Silos

Shelves MUST NOT become isolated content buckets.

They are filtered views over the curriculum graph. Cross-disciplinary overlap
must remain possible, especially for contexts such as pregnancy, emergency
care, pediatrics/neonatology, psychiatry, ethics, and internal medicine.

## 15. Rebuilding Full Subject Pools For Lightweight UI

Subject dropdowns, top-bar counts, and simple availability checks MUST NOT
trigger full generated-case construction.

Use indexes, counts, and caches.

## 16. Creating Theme-Specific Feature Patches

Do not style a feature for one theme and then patch every other theme after the
fact.

New UI should compose shared presentation primitives. Themes should render the
primitive differently.

Theme-specific renderers MAY exist when the interaction model is genuinely
different, but they MUST consume the same semantic contracts.

## 17. Letting Generated Cases Become Source Truth

Generated cases are outputs. They MUST NOT become the durable authority for
medical knowledge.

If a generated case is repetitive, awkward, or medically weak, improve the
Knowledge Object or ShelfSchemaNode.

## 18. Hiding Performance Problems In React

Do not fix generation slowness by adding memoization only around components.

Performance fixes SHOULD occur at the curriculum index, generated-case cache,
adaptive selection, and API layers.

## 19. Creating Fake Controls

Every visible control MUST perform a real function.

If a feature is not implemented, its control should be omitted, disabled with
truthful copy, or implemented.

## 20. Bypassing The Architecture For Speed

Performance work MUST NOT flatten the schema architecture back into a static
question list.

The correct optimization path is:

```text
index -> cache -> lazy generation -> cheap selection
```

not:

```text
remove schema nodes -> store shallow questions
```
