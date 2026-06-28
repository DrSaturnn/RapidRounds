# RFC-017: Canonical Learner State Engine

## Status

Architectural RFC. This document defines the canonical learner domain model that
future adaptive RapidRounds systems MUST use. It does not introduce runtime
behavior, database schema, API contracts, or implementation details.

## Context

RapidRounds now includes semantic answer matching, partial-credit recognition,
Decision Repair, Decision Boundary Repair, Teach Me More, Continue Learning, an
adaptive learning trajectory, and a cross-shelf curriculum graph. These systems
all depend on an implicit model of what the learner knows, misunderstands,
retrieves, forgets, and needs next.

This RFC makes that model explicit.

The Learner State Engine is the canonical educational state layer for
RapidRounds. It MUST remain consistent with
[docs/PROJECT_CONSTITUTION.md](../docs/PROJECT_CONSTITUTION.md), especially the
principle that RapidRounds is an adaptive clinical reasoning engine, not merely
a question bank.

## 1. Architectural Role

The Learner State Engine is the canonical domain model of the learner within
RapidRounds.

All adaptive behavior MUST derive from this model. Future systems MUST extend
the Learner State Engine rather than creating independent learner
representations.

The Learner State Engine is the single source of truth for educational state. It
does not replace the Curriculum Graph, Question Engine, Decision Repair, Teach
Me More, Continue Learning, analytics, or Aster. It supplies the learner-specific
state those systems need in order to act coherently.

## 2. Purpose of the Learner State Engine

RapidRounds needs learner state because answer history alone cannot explain what
the learner understands.

Two learners may miss the same question for different reasons:

- one did not know the illness script
- one recognized the diagnosis but selected the wrong management step
- one missed the pivot clue
- one knew the concept but had low confidence
- one selected an adjacent answer that is correct in a nearby context

Answer history records events. Learner state interprets accumulated educational
evidence across events.

Every adaptive system depends on learner state because recommendations, review
timing, repair emphasis, analytics, and future tutoring require estimates of
understanding, not only a list of past answers.

## 3. Canonical Learner Model

RapidRounds knows the learner through educational evidence and derived
estimates. The learner model SHOULD distinguish persistent state, transient
state, session state, and longitudinal state.

### Persistent State

Persistent state is durable across sessions and deployments. It SHOULD include
educational evidence, mastery estimates, retrieval history, repair history,
confidence signals when available, misconception patterns, cognitive error
patterns, and longitudinal learning trajectory.

Persistent state MUST be the source used by durable adaptive systems.

### Transient State

Transient state exists only to support the current interaction. It may include
the current submitted answer, the current evaluation result, temporary tutor
content, the currently displayed repair mode, and the currently selected
Continue Learning option.

Transient state MUST NOT become a competing learner model.

### Session State

Session state preserves practice momentum. It may include current question,
current round, questions already answered in the active session, adaptive queue
position, and recent interaction context.

Session state SHOULD support fast resume, but it MUST NOT own longitudinal
mastery.

### Longitudinal State

Longitudinal state represents the learner over time. It SHOULD include trends in
concept mastery, repeated reasoning errors, delayed retrieval performance,
repair effectiveness, confidence calibration, and progression through curriculum
relationships.

Longitudinal state SHOULD be resilient to noisy events such as guessing,
careless mistakes, blank responses, and isolated lucky answers.

## 4. Separation of Concerns

### Question State

Question State owns the educational prompt and its metadata: stem, task,
correct answer, accepted answers, key clue, explanation, board fingerprint,
clinical pattern, common trap, and curriculum mapping.

Question State MUST NOT own learner mastery, learner confidence, repair history,
or adaptive priority.

### Session State

Session State owns the current practice flow: active question, round progress,
local queue position, current answer attempt, and fast-resume context.

Session State MUST NOT be the durable source of concept mastery or reasoning
profile.

### Learner State

Learner State owns learner-specific educational evidence and estimates:
mastery, confidence, misconceptions, reasoning patterns, retrieval history,
repair history, and longitudinal trajectory.

Learner State MUST NOT own question content, curriculum content, rendering
logic, or adaptive rules.

### Curriculum State

Curriculum State owns the graph of concepts, objectives, prerequisites,
successors, related concepts, common distractors, shelf tags, clinical context
tags, and discipline overlap.

Curriculum State MUST NOT store whether a specific learner has mastered a node.

### Application State

Application State owns runtime UI and platform concerns such as loading,
navigation, collapsed panels, request status, and local display choices.

Application State MUST NOT become an educational source of truth.

## 5. Units of Knowledge

The Learner State Engine is concept-centric rather than question-centric.
Questions produce evidence, but concepts and objectives are what the learner
actually develops.

The canonical educational units are:

- **Concepts**: named clinical ideas such as gestational hypertension,
  carboprost contraindication, or cord prolapse management.
- **Objectives**: specific learner capabilities, such as identifying the next
  best step or recognizing a contraindication.
- **Illness scripts**: retrievable clinical patterns that organize patient,
  presentation, hallmark findings, implications, and management pearls.
- **Clinical decisions**: the action, diagnosis, distinction, sequence, or
  contraindication being tested in a RapidRound.
- **Reasoning patterns**: recurring learner behaviors such as premature closure,
  missed pivot clue, timing error, severity error, or management error.
- **Misconceptions**: durable misunderstandings or overextensions of a true rule.
- **Decision boundaries**: the discriminating clue that separates one concept or
  decision from another.

The hierarchy is:

```text
curriculum context
  -> concept
    -> objective
      -> clinical decision
        -> question evidence
```

Reasoning patterns, misconceptions, and decision boundaries may attach at
multiple levels. A learner may understand a concept broadly while still missing
a specific boundary, or may answer one question correctly without mastering the
underlying objective.

## 6. Mastery

Mastery is RapidRounds' evolving estimate that a learner can retrieve and apply
a concept or objective correctly under exam-like conditions.

Mastery is not:

- a single correct answer
- raw accuracy
- the number of times a question was seen
- confidence alone
- completion of a topic list

Correctness is event-level. Mastery is longitudinal.

One correct answer does not equal mastery because it may reflect guessing,
recognition of a superficial clue, recent exposure, or an easier version of the
same concept. Mastery SHOULD be supported by accumulated evidence across
retrieval attempts, time intervals, related decision boundaries, confidence
calibration, and performance after repair.

## 7. Confidence

Confidence is a first-class educational signal because correctness alone cannot
distinguish stable knowledge from fragile retrieval.

RapidRounds SHOULD interpret confidence in relation to correctness:

- **Correct + high confidence** suggests stable retrieval, while still requiring
  spacing and transfer checks before declaring durable mastery.
- **Correct + low confidence** suggests fragile or emerging knowledge that may
  need reinforcement.
- **Incorrect + high confidence** suggests a strong misconception,
  overgeneralization, or misleading illness script.
- **Incorrect + low confidence** suggests uncertainty or knowledge gap and may
  benefit from concept-building rather than aggressive repair.

Confidence complements answer evaluation, cognitive error classification, and
retrieval history. It SHOULD refine mastery estimates but MUST NOT replace
evidence from actual clinical decisions.

## 8. Cognitive Error Model

Cognitive errors are persistent educational signals, not merely labels attached
to isolated questions.

When a learner repeatedly shows the same reasoning pattern, the Learner State
Engine SHOULD accumulate that pattern as part of the learner's reasoning
profile. Examples include missed pivot clue, premature closure, illness script
confusion, management error, contraindication error, timing error, severity
error, distractor attraction, overgeneralization, and knowledge gap.

Cognitive error labels SHOULD primarily support adaptation, analytics, and
future coaching. They MUST NOT dominate the learner-facing repair UI. Immediate
repair should teach the clinical takeaway first.

## 9. Evidence Updates

Learner state changes through evidence updates. This RFC does not define exact
scoring algorithms.

Correct responses SHOULD add evidence for retrieval and application of the
tested concept, objective, and decision boundary. Repeated correct responses
over time SHOULD strengthen mastery more than a single immediate success.

Incorrect responses SHOULD add evidence about the missed concept, incorrect
answer, reasoning pattern, misconception, and decision boundary when these can
be identified.

Partial-credit responses SHOULD add positive evidence for the recognized branch
and corrective evidence for the missing specificity, sequence, severity,
management step, or pivot clue.

Decision Repair SHOULD add evidence that the learner was exposed to corrective
teaching. It MUST NOT be treated as proof that the learner has mastered the
concept.

Teach Me More SHOULD add evidence of deeper exposure to the illness script,
recognition path, comparison, and NBME pivot. It SHOULD influence future
recommendations, but it MUST NOT equal retrieval mastery.

Repeated successful retrieval SHOULD strengthen mastery and may reduce review
priority, especially when separated by time and varied contexts.

Delayed review SHOULD carry more mastery evidence than immediate repetition,
because it better approximates durable retrieval.

## 9.5 Evidence Model

The Learner State Engine stores educational evidence, not objective truth.

Every interaction contributes evidence toward the learner model. Evidence
accumulates over time and may strengthen, weaken, or refine mastery estimates.

Learner state represents the system's best current estimate of learner
understanding rather than an absolute measure of knowledge.

The learner model SHOULD remain resilient to noisy data, occasional guessing,
careless mistakes, blank responses, and incomplete evidence. Isolated events
SHOULD rarely cause extreme state changes without corroborating evidence.

## 10. Knowledge Relationships

Concept relationships come from the Curriculum Graph. A concept may have parent
contexts, prerequisites, successors, related concepts, common distractors,
management concepts, shelf tags, and cross-disciplinary tags.

Improvement in one concept may influence related concepts, but it MUST NOT
automatically produce mastery elsewhere. For example, improvement in
gestational hypertension may increase readiness for preeclampsia review, but it
does not prove mastery of preeclampsia, HELLP syndrome, magnesium prophylaxis,
or delivery timing.

Evidence propagation SHOULD be conservative. Related concepts may receive
contextual signals such as exposure, readiness, confusion risk, or review
priority. They SHOULD preserve independent mastery estimates until the learner
produces direct evidence on those concepts.

## 11. State Ownership

Every educational subsystem must read from and write through the same learner
state.

Examples of subsystems that may generate evidence include:

- Question Engine
- Adaptive Engine
- Decision Repair
- Teach Me More
- Continue Learning
- future AI Tutor
- Analytics

No subsystem SHOULD create a competing learner model. The Learner State Engine
is the canonical write authority for educational state.

Educational subsystems may generate evidence, but they MUST NOT persist
independent durable learner state. All durable educational updates MUST
ultimately resolve into the Learner State Engine.

## 12. Relationship to Decision Objects

This RFC does not implement Decision Objects.

Architecturally:

- Decision Objects produce evidence.
- Learner State stores evidence.
- Curriculum Graph organizes evidence.
- Adaptive Engine acts on evidence.

Decision Objects and Learner State remain separate responsibilities because a
decision object defines what is being tested, while learner state estimates what
this learner currently understands. Mixing them would make content, evaluation,
and adaptation harder to audit and extend.

## 13. What Learner State Does Not Own

Learner State does not own:

- question text
- curriculum content
- explanations
- adaptive rules
- UI state
- rendering logic
- educational content

Learner State owns:

- educational evidence
- confidence signals
- mastery estimates
- misconceptions
- reasoning profile
- retrieval history
- repair history
- longitudinal learning trajectory

## 14. Non-Negotiable Principles

1. RapidRounds MUST have one canonical learner state.
2. Adaptive systems MUST NOT duplicate durable learner state.
3. Feature-specific mastery systems MUST NOT be created outside the Learner
   State Engine.
4. The learner model MUST remain concept-centric rather than question-centric.
5. Learner state SHOULD persist across sessions and deployments.
6. Adaptive behavior MUST be explainable from learner evidence and curriculum
   relationships.
7. Educational evidence MUST remain auditable.
8. Learner state MUST represent estimates, not certainty.
9. Unknown responses MUST NOT be counted as reasoning failures.
10. Cognitive error labels SHOULD support adaptation and analytics before
    learner-facing display.
11. State evolution SHOULD favor additive changes over breaking changes.
12. Question content, curriculum content, and learner evidence MUST remain
    separate architectural responsibilities.

## 15. Future Extensibility

Future systems SHOULD consume learner state rather than redefine it.

This includes:

- adaptive scheduling
- spaced repetition
- simulations
- educator dashboards
- AI coaching
- Step 2 readiness prediction
- mobile offline mode
- future educational analytics

Each future system SHOULD add evidence types, derived estimates, or read models
through the Learner State Engine. It SHOULD NOT create a separate persistence
path for mastery, confidence, misconceptions, or reasoning profile.

Future Aster work SHOULD use learner state to ground coaching, explain adaptive
recommendations, identify reasoning patterns, and plan review without inventing
unsupported learner attributes.

## 16. State Evolution

The Learner State Engine should be designed to evolve over time.

Future RFCs may introduce additional learner attributes without invalidating
existing learner data. The learner model SHOULD prioritize forward
compatibility so that educational progress remains durable across future
RapidRounds releases.

Architectural evolution SHOULD favor additive changes over breaking changes.
When breaking changes are unavoidable, the RFC MUST describe migration,
compatibility, and audit implications.

## Implementation Boundary

This RFC intentionally avoids database schema, API design, scoring algorithms,
and runtime behavior. Those details belong in future implementation RFCs.

Any future implementation RFC for Learner State MUST preserve:

- the Constitution's practice-first product model
- the curriculum graph as the organizing layer
- concept-centric learner state
- auditable educational evidence
- separation between content, curriculum, session state, and learner state
- concise learner-facing repair
- internal-first cognitive error labels
