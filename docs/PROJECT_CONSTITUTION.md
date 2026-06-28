# RapidRounds Project Constitution

This document is the durable architectural contract for RapidRounds. It is not
an RFC, a roadmap, or a feature proposal. It defines the product principles that
future RFCs, implementation work, tests, and content authoring MUST follow.

RapidRounds is an adaptive clinical reasoning engine, not merely a question
bank.

## 1. Mission

RapidRounds exists to train high-speed clinical reasoning for NBME-style medical
decisions. It MUST help learners recognize the deciding clue, choose the correct
clinical action or diagnosis, repair errors immediately, and connect each
decision to a broader curriculum trajectory.

RapidRounds SHOULD optimize for transfer: the learner should become better at
the next unfamiliar vignette, not only at remembering the current item.

## 2. Product Identity

RapidRounds is a continuous training environment. The default product posture
MUST be practice-first: opening the application should place the learner into
training, not into a dashboard or menu.

Progress, analytics, and review surfaces are secondary. They SHOULD support the
training flow without interrupting it.

Each RapidRound MUST test one primary clinical decision. A question may contain
rich clinical context, but the learner-facing task should resolve to a single
dominant decision boundary.

## 3. Educational Philosophy

RapidRounds teaches expert reasoning, not answer-key memorization.

Educational content MUST focus on:

- illness scripts
- expert recognition paths
- pivot clues and pertinent negatives
- decision boundaries
- clinically meaningful distractors
- immediate versus downstream management
- when a nearby answer becomes correct

RapidRounds MUST distinguish educational states that require different teaching:

- correct recall
- partially correct reasoning
- task mismatch
- adjacent but wrong clinical decision
- unknown concept state
- unrelated incorrect answer

Unknown responses MUST receive concept building rather than decision repair.
Nearby clinically appropriate wrong answers SHOULD receive boundary teaching
rather than generic correction.

## 4. Core Design Laws

The following laws are non-optional unless this Constitution is explicitly
amended.

1. RapidRounds MUST open into training, not a dashboard.
2. Each RapidRound MUST have one primary clinical decision.
3. Decision Repair MUST show the correct answer and key clue before secondary
   teaching or metadata.
4. Cognitive error labels are primarily internal and adaptive. They MUST NOT be
   shown in the default repair screen unless a future RFC proves that doing so
   directly improves learning.
5. Teach Me More MUST follow a stable educational structure: Illness Script,
   Expert Recognition, Don't Confuse With, NBME Pivot, and optional Why This Was
   Tempting.
6. Comparison tables MUST contain factual clinical discriminators, not
   implementation placeholders.
7. Continue Learning MUST be actionable. Passive related tags are insufficient
   for the primary learning trajectory.
8. Shelves MUST be filtered views over the curriculum graph, not isolated silos.
9. Default explanations SHOULD be concise enough to preserve cognitive
   momentum.
10. Runtime behavior MUST NOT depend on proprietary question wording or copied
    explanations.
11. UI surfaces MUST be composed from reusable themed presentation primitives.
    Feature-specific theme patches are prohibited unless they first establish a
    reusable primitive.

## 5. Learner Model Principles

The learner model MUST preserve the difference between answer correctness and
reasoning state. A wrong answer is not always the same kind of error.

The evaluation layer SHOULD recognize, at minimum:

- correct or equivalent answers
- spelling and phrasing variation
- partial credit
- task mismatch
- unknown responses
- incorrect responses

Unknown responses MUST NOT be treated as reasoning failures. Partial credit
SHOULD identify the part of the reasoning chain that was correct before
repairing the missing distinction.

Cognitive error types SHOULD drive adaptive decisions, analytics, and future
tutoring. They SHOULD remain behind the scenes during immediate repair unless a
learner-facing use is explicitly justified.

## 6. Question and Content Principles

Questions SHOULD be authored as clinical decisions, not trivia prompts.

Each question SHOULD provide enough structured metadata for the education system
to teach without guessing, including the correct answer, accepted answers, key
clue, board fingerprint, explanation, clinical pattern, common trap, and
curriculum mapping when available.

Content MUST be original. RapidRounds may teach public medical knowledge,
publicly accepted guidelines, and NBME-style reasoning patterns, but it MUST NOT
reproduce proprietary question stems, proprietary explanations, or proprietary
answer-key language.

Educational text SHOULD be concise, clinically precise, and focused on the
decision boundary. It MUST NOT contain generic placeholder phrases such as
"Different next best step" or "Surface-level overlap" as visible teaching
content.

## 7. Adaptive Engine Principles

The adaptive engine MUST treat questions as connected curriculum nodes, not as
independent cards.

The curriculum graph is the canonical organization layer for clinical concepts,
patient contexts, shelf views, cross-disciplinary overlap, prerequisites,
successors, related concepts, and common distractors.

Continue Learning SHOULD use signals such as:

- recent misses
- commonly confused concepts
- prerequisite concepts
- downstream concepts
- management concepts
- curriculum graph relationships
- cross-shelf context

The learner MAY override a recommendation, but the default flow SHOULD always
offer the highest-value next decision without requiring manual navigation.

Adaptive recommendations MUST NOT interrupt the answer -> repair -> learn ->
next-question loop.

## 8. AI Tutor Responsibilities

Aster and any future AI tutor layer MUST obey this Constitution.

AI tutor behavior SHOULD be grounded in available question metadata, evaluation
state, curriculum graph relationships, and learner history. It MUST NOT invent
clinical facts, hidden metadata, or unsupported learner diagnoses.

AI-assisted grading, when present, MUST remain bounded by the answer evaluation
contract. Deterministic accepted-answer and semantic matching logic remain the
auditable foundation for grading behavior unless an RFC explicitly changes that
contract.

AI-generated educational content MUST be original, concise, and oriented toward
clinical reasoning. It MUST NOT reproduce proprietary educational material or
inflate explanations beyond the needs of the current decision.

## 9. Data and State Principles

RapidRounds SHOULD preserve learner momentum across sessions. Practice state
SHOULD remember the current question, current round, answered questions, and
adaptive queue position where the implementation supports it.

Database schema changes MUST be justified by durable product need, not by
temporary implementation convenience. Schema changes MUST be explicit in the RFC
that requires them.

Production data access MUST be compatible with the current Prisma and Postgres
deployment model. Application code MUST NOT depend on local SQLite behavior for
production.

Health checks, analytics, and diagnostics MUST NOT expose secrets or protected
implementation details.

## 10. Extensibility Rules

New specialties SHOULD extend the same architecture rather than creating
parallel systems.

Future work SHOULD add:

- curriculum graph nodes and mappings
- clinical comparison templates
- illness script templates
- decision boundary mappings
- cognitive error mappings
- tests for each new educational contract

Future work MUST NOT hardcode a specialty-specific UI path when the curriculum
graph, evaluation layer, or tutor content system can express the same concept.

Explicit mappings are preferred over broad AI inference when the content is
high-stakes, testable, and commonly encountered.

Presentation work MUST extend the shared theme system rather than patching
individual features. New UI surfaces SHOULD be composed from primitives such as
Page, Card, Panel, Callout, Sidebar, Drawer, Modal, Table, Comparison,
Annotation, Button, Input, Badge, Flow, Timeline, NotebookSection, MarginNote,
Divider, and Toolbar. If a future feature needs a visual structure that is not
covered by an existing primitive, that primitive MUST be added to the design
system before the feature depends on it.

## 11. Non-Negotiable Constraints

RapidRounds MUST NOT:

- become a dashboard-first product
- treat shelves as isolated silos
- show cognitive error labels in default Decision Repair
- use placeholder text as visible educational content
- reintroduce universal Try One More behavior
- make unknown responses look like incorrect clinical reasoning
- change grading behavior without tests
- change database schema without explicit justification
- copy proprietary question stems, explanations, or answer-key language
- let adaptive recommendations block fast practice flow
- ship feature-specific UI styling that requires later per-theme patching

RapidRounds MUST:

- preserve one primary clinical decision per RapidRound
- keep Decision Repair concise and immediately useful
- keep Teach Me More structured and scannable
- keep Continue Learning connected to curriculum relationships
- preserve existing API contracts unless an RFC explicitly changes them
- protect production reliability before adding educational surface area
- ensure new UI surfaces inherit Modern Academic, Moleskine Notebook, Dark
  Clinical, and Editorial Magazine through shared presentation primitives

## 12. Relationship Between Constitution and RFCs

RFCs define bounded changes. This Constitution defines the durable rules those
changes must obey.

If an RFC conflicts with this Constitution, the RFC MUST explicitly state that it
is proposing a constitutional amendment. Otherwise, the Constitution takes
precedence.

Completed RFCs may inform future revisions to this document, but implementation
details from an RFC SHOULD NOT be copied here unless they have become durable
architecture.

Tests SHOULD encode constitutional behavior when the behavior is observable.

## 13. Terminology Appendix

**RapidRound**

A single training unit that asks the learner to make one primary clinical
decision.

**Clinical Decision**

The diagnosis, management step, contraindication, sequence, or disposition that
the vignette is testing.

**Semantic Matching**

The answer evaluation layer that recognizes clinically equivalent phrasing,
accepted aliases, spelling variation, partial answers, task mismatches, unknown
responses, and incorrect answers.

**Decision Repair**

The concise post-answer teaching surface that shows the correct answer, key
clue, brief explanation, and focused repair when needed.

**Decision Boundary**

The clinical distinction that separates the correct answer from a nearby
plausible answer.

**Teach Me More**

The expanded educational panel that teaches the illness script, expert
recognition path, comparison table, NBME pivot, and optional temptation analysis.

**Unknown**

A learner state indicating that the concept was not in memory. It requires
recognition-pattern teaching, not wrong-answer repair.

**Partial Credit**

A learner state indicating that part of the clinical reasoning was correct but
the final decision or specificity was incomplete.

**Task Mismatch**

A learner state indicating that the answer belongs to a different task than the
question asked, such as giving a diagnosis when the question asks for management.

**Cognitive Error Type**

An internal classification of the reasoning failure, such as missed pivot clue,
premature closure, contraindication error, timing error, or knowledge gap.

**Curriculum Graph**

The structured network of clinical concepts, patient contexts, shelf tags,
discipline tags, prerequisites, successors, related concepts, and common
distractors.

**Shelf View**

A filtered view over the curriculum graph. A shelf view is not a separate silo.

**Continue Learning**

The adaptive recommendation surface that proposes the next highest-value
learning objective and optional related concepts.

**Aster**

The planned AI tutoring and coaching layer. Aster-facing work must follow the
same grading, content, adaptation, and safety principles as the rest of
RapidRounds.
