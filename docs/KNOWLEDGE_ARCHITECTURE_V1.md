# RapidRounds Knowledge Architecture V1

This document defines the durable knowledge architecture for RapidRounds. It is
not an RFC, a feature proposal, or a UI specification.

RapidRounds is a Clinical Reasoning Operating System. It is not a question bank.

For product-level laws, see [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md).
For runtime boundaries, see [SYSTEM_SPECIFICATION_V1.md](SYSTEM_SPECIFICATION_V1.md).

## 1. Core Principle

Questions are generated outputs of the reasoning graph. They are not the source
of truth.

The source of truth MUST be structured clinical reasoning knowledge:

```text
KnowledgeObject
-> ClinicalReasoningNode / ShelfSchemaNode
-> GeneratedCase
-> RapidRoundsReasoningObject
-> PracticeSession
-> Renderer
```

RapidRounds MUST train transferable reasoning. A learner should improve at
recognizing the next unfamiliar NBME-style presentation, not merely remember an
answer to a stored stem.

## 2. Knowledge Objects

A Knowledge Object is the durable medical concept container. It MAY represent a
disease, syndrome, management domain, physiology mechanism, ethical principle,
statistical concept, or clinical context.

A Knowledge Object SHOULD contain public, guideline-validated medical truth:

- canonical terminology
- accepted aliases
- relevant clinical contexts
- shelf and system alignment
- guideline references or public validation sources
- related concepts
- common traps
- management rules
- contraindications
- next-time rules

A Knowledge Object MUST NOT be treated as a question. It is the parent source
from which multiple clinical reasoning nodes may be derived.

## 3. Clinical Reasoning Nodes / ShelfSchemaNodes

A Clinical Reasoning Node, currently represented in code as a `ShelfSchemaNode`,
is the atomic curriculum unit for practice generation.

Each node represents one specific NBME-style reasoning problem, such as:

- recognition
- diagnosis
- differential diagnosis
- initial management
- definitive management
- next best step
- escalation
- complication recognition
- contraindication
- disposition
- follow-up
- mechanism or pathophysiology
- risk factor interpretation
- screening or prevention
- prognosis or counseling
- ethics or capacity
- biostatistics interpretation

One disease or topic SHOULD produce multiple nodes when NBME-style reasoning
tests that disease in multiple ways.

Each node MUST define, where applicable:

- shelf and subject
- system or blueprint category
- topic and schema name
- question archetype
- estimated yield
- Core NBME and/or Comprehensive tier eligibility
- epidemiology or context frames
- chief problem
- pertinent positives
- pertinent negatives
- pivot clue
- discriminator pair
- semantic links
- answer type
- correct answer or action
- common wrong schemas
- management stage
- prior interventions or downstream state changes
- complication and contraindication branches
- next-time rule
- source policy metadata

The node, not the parent disease, MUST determine the generated case task.

## 4. Decision Boundaries

A Decision Boundary is the conceptual border a pivot clue is meant to separate.
It is not necessarily the learner's answer versus the correct answer.

A valid Decision Boundary SHOULD include:

- concept A
- concept B
- shared presentation
- pivot that separates them
- why the pivot supports concept A
- what finding would support concept B
- common wrong schema
- board rule or next-time rule

Decision Boundary teaching MUST be used when the learner selects a clinically
meaningful nearby schema. If no meaningful boundary is available, RapidRounds
MUST omit the comparison rather than render filler.

## 5. Semantic Links

Semantic Links connect source text to reasoning concepts.

They SHOULD encode relationships such as:

- proves
- supports
- rules out
- activates
- explains

Renderers MUST consume Semantic Links. Renderers MUST NOT invent them from
visual text matching.

Example:

```text
"posterior vaginal wall bulge with Valsalva"
-> proves
-> "pelvic organ prolapse"
-> "rectocele"
```

## 6. Prototype / Core NBME Cases

Core NBME cases are the high-yield, pivot-driven outputs of schema nodes. They
are intended for:

- Rapid Round mode
- Adaptive mode
- Weak Areas mode
- high-yield shelf preparation
- first-pass mastery

Core cases SHOULD use:

```text
context + pivot + task
```

Core cases MUST:

- test one dominant decision boundary
- minimize distractor load
- use concise stems
- preserve one primary clinical decision
- avoid repeated stems with superficial clue swaps

## 7. Comprehensive Cases

Comprehensive cases are broader, layered outputs of schema nodes. They are
intended for:

- Comprehensive mode
- Review mode
- breadth review
- second-order management
- complications
- edge cases
- lower-yield blueprint coverage

Comprehensive cases MAY include:

- atypical context
- misleading context
- prior interventions
- response or nonresponse
- downstream state changes
- additional pertinent negatives
- distractor-rich presentations
- complication branches
- contraindication branches

Comprehensive generation SHOULD follow:

```text
epidemiology + context + pertinent positives + pertinent negatives + pivot + distractors + task
```

## 8. Management Trees

Management knowledge MUST support staged clinical progression.

Management should not repeatedly ask the same initial step. It SHOULD move
through state changes such as:

```text
initial presentation
-> initial stabilization
-> first intervention
-> response or nonresponse
-> next step
-> complication
-> definitive management
-> disposition or follow-up
```

If a generated case includes a prior intervention, the correct answer SHOULD
advance to the appropriate downstream node when the clinical state has changed.

## 9. Competencies

Competencies are learner-facing or engine-facing capabilities that schema nodes
train over time. A competency MAY map across shelves.

Examples include:

- identify the pivot clue
- distinguish neighboring schemas
- choose the immediate next step
- escalate after failed initial therapy
- recognize contraindications
- interpret a diagnostic test
- apply a screening rule
- counsel based on prognosis
- preserve ethics and capacity principles

Competencies SHOULD be derived from the reasoning graph, not from arbitrary
question tags.

## 10. Knowledge Acquisition Engine

The Knowledge Acquisition Engine is the boundary where external educational
material, learner notes, public references, and future extension captures may
inform RapidRounds knowledge.

It MAY extract:

- tested concept
- question archetype
- clinical schema
- pivot clues
- answer choice comparison
- educational objective
- incorrect-answer discriminators
- candidate Decision Boundaries

It MUST NOT store proprietary stems, answer choices, rationales, or unique
source-specific item expressions.

When external material is used, RapidRounds SHOULD reconstruct the clinical
truth from public medical knowledge and guideline validation before generating
original cases.

## 11. Knowledge Explorer

The Knowledge Explorer is a future advanced surface over the reasoning graph.
It MAY expose subjects, systems, topics, schema nodes, competencies, and
Decision Boundaries.

The primary practice UI MUST NOT expose the full internal graph by default.
Normal learners should choose a high-level subject and session mode; RapidRounds
should decide the specific schema node.

## 12. Student, Resident, And Clinician Views

RapidRounds MAY eventually support different views of the same knowledge graph:

- student view: shelf-relevant schema recognition and NBME decision boundaries
- resident view: staged management, escalation, complications, and disposition
- clinician view: guideline-concordant reasoning and differential refinement

These views SHOULD filter or emphasize the same underlying knowledge graph.
They MUST NOT create separate contradictory knowledge systems.

## 13. Public Blueprint Weighting

Shelf coverage SHOULD align with public NBME or public exam blueprint
categories where available.

High-weight categories SHOULD receive:

- more schema nodes
- more Core NBME cases
- more adaptive review weight
- more discriminator-pair practice

Lower-weight categories MUST NOT be ignored. They SHOULD remain represented in
Comprehensive coverage.

## 14. Guideline-Validated Medical Truth

RapidRounds may store generalized medical reasoning structures. These
structures are not proprietary expressions.

Allowed:

- context categories
- illness scripts
- pivot categories
- discriminator pairs
- management stages
- complication branches
- contraindication branches
- public guideline-concordant relationships
- standard medical terminology

Forbidden:

- copied proprietary stems
- copied answer choices
- copied rationales
- source-specific tables
- unique commercial item fact-pattern reconstruction
- near-duplicate proprietary questions

Knowledge metadata SHOULD identify validation sources and source policy status.

## 15. Original Case Generation

Generated cases MUST be original RapidRounds cases.

Generated cases MUST include enough semantic structure to support:

- free-response answer evaluation
- partial credit
- Decision Repair
- Decision Boundary teaching
- post-answer schema teaching
- semantic link rendering
- vignette clue annotation
- adaptive sequencing

Generated cases MUST NOT be treated as durable source knowledge. If generated
case text is weak, the schema node should be improved rather than treating the
bad case as authoritative.

## 16. Non-Negotiable Knowledge Rules

RapidRounds MUST:

- seed reasoning schemas before cases
- generate cases from schema nodes
- preserve one primary clinical decision per case
- make the pivot clue the central educational object
- keep semantic links engine-owned
- validate medical truth against public sources
- keep source expression original

RapidRounds MUST NOT:

- generate questions directly from parent diseases as the primary architecture
- use shallow clue swapping as breadth
- store external proprietary question-bank expression
- expose the full internal graph in normal practice mode
- let UI components become the source of medical logic
