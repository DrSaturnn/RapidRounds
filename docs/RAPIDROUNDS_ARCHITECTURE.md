# RapidRounds Architecture

This document describes the current RapidRounds system at a high level. It is
an implementation overview, not the governing product contract.

For durable product laws, educational philosophy, and non-negotiable design
constraints, see [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md). For
individual feature proposals, see the [RFC directory](../rfc/).

## Mission

RapidRounds trains clinical reasoning through fast free-response decisions,
immediate repair, and adaptive topic progression. The system is organized around
clinical decisions and curriculum relationships rather than isolated cards.

## Philosophy

The core educational loop is:

```text
clinical decision -> answer evaluation -> focused repair -> deeper teaching -> adaptive next step
```

The product should preserve cognitive momentum. Learners should quickly see the
correct answer, the key clue, the reason their answer did or did not fit, and
the next high-value concept to strengthen.

## Core Educational Principles

- Each RapidRound tests one primary clinical decision.
- NBME-style reasoning is taught through pivot clues, pertinent negatives,
  illness scripts, and decision boundaries.
- Unknown responses are concept-building moments, not reasoning failures.
- Clinically adjacent wrong answers should teach where that answer becomes
  correct.
- Shelves are filtered views over a curriculum graph, not isolated silos.
- Cognitive error types are primarily internal signals for adaptation and
  analytics, not default repair-screen labels.

## Product Identity

RapidRounds opens into training. Progress and analytics exist, but they are
secondary to the continuous practice flow.

The learner-facing experience is intentionally compact:

1. A question appears.
2. The learner submits a free-response answer.
3. RapidRounds evaluates the answer.
4. Decision Repair or concept-building feedback appears.
5. Teach Me More and Continue Learning are available without blocking the next
   question.

## Current System Architecture

The application is a Next.js App Router project backed by Prisma and Postgres.
The main runtime layers are:

- `app/` - pages and API routes, including practice, analytics, progress, and
  health endpoints.
- `components/` - learner-facing practice, tutor, and educational panels.
- `hooks/` - client-side practice session persistence and training flow state.
- `lib/answer-check.ts` - deterministic answer evaluation and classification.
- `lib/tutor-content.ts` - Decision Repair and Teach Me More content assembly.
- `lib/decision-boundary-repair.ts` - explicit nearby-correct-context repairs.
- `lib/cognitive-error.ts` - internal reasoning-error classification.
- `lib/clinical-comparison.ts` - diagnosis-specific comparison content.
- `lib/expert-illness-script.ts` - concise expert illness scripts.
- `lib/learning-trajectory.ts` - Continue Learning and next-concept selection.
- `lib/curriculum-graph.ts` - cross-shelf curriculum graph and question mapping.
- `prisma/` - schema and seed content.
- `tests/` - behavioral contracts for evaluation, repair, tutor content,
  adaptive learning, curriculum graph, production readiness, and UI hierarchy.

## Educational Engine

### Semantic Matching

Answer evaluation starts with deterministic normalization and accepted-answer
matching. It recognizes equivalent answers, spelling variation, partial credit,
task mismatch, unknown responses, and incorrect answers. Optional AI-assisted
semantic review can support grading, but deterministic evaluation remains the
auditable base.

### Decision Repair

Decision Repair is the compact post-answer teaching panel. It prioritizes the
correct answer and key clue, followed by a brief explanation and focused repair
when applicable.

Cognitive error labels are generated internally but are not shown in the default
repair hierarchy.

### Decision Boundary Repair

Decision Boundary Repair handles answers that are clinically correct in a nearby
context. Instead of treating these as random wrong answers, the repair explains
where the learner's answer belongs and what boundary separates it from the
current question.

### Teach Me More

Teach Me More is the expanded learning panel. Its standard structure is:

1. Illness Script
2. Expert Recognition
3. Don't Confuse With
4. NBME Pivot
5. Why This Was Tempting, when the learner's answer was incorrect or partial

Comparison tables should contain real clinical discriminators, not placeholder
implementation language.

### Recognition Paths

Recognition paths show how an expert moves from presentation to decision. They
should be short algorithms or stepwise patterns rather than long prose.

### Partial Credit

Partial credit recognizes answers that are on the correct clinical branch but
are incomplete, insufficiently specific, or missing the final discriminator.
Partial answers receive focused repair rather than generic incorrect feedback.

### Unknown State

Blank, unsure, pass, and similar responses are classified as unknown. Unknown
state triggers concept-building content: correct answer, recognition clues, and
board fingerprint. It skips wrong-answer comparison and Decision Boundary
Repair.

## Adaptive Learning

The adaptive layer turns isolated questions into a connected training
trajectory. Continue Learning uses curriculum relationships, recent misses,
commonly confused concepts, prerequisites, successors, downstream management,
and cross-shelf overlap to recommend the next useful concept.

The learner can still continue directly to the next question. Adaptive guidance
should support the flow, not interrupt it.

## Curriculum Graph

`lib/curriculum-graph.ts` defines the master curriculum graph. Nodes can carry
shelf tags, clinical context tags, system tags, discipline tags, decision-type
tags, prerequisite links, successor links, related concepts, and common
distractors.

Shelf views are filters over this graph. For example, an OB/GYN shelf view may
include core obstetrics, internal medicine in pregnancy, psychiatry in
pregnancy, pediatrics/neonatology, family medicine, emergency medicine, surgery,
and ethics where clinically relevant.

## Aster

Aster is the planned AI tutoring and coaching layer. Aster-facing work should
use the same answer evaluation contract, curriculum graph, learner model, and
content principles as the rest of RapidRounds.

The current codebase includes bounded AI-assisted grading support, but the
constitutional rules for Aster are intentionally broader than the current
runtime surface.

## UI Philosophy

The UI should feel like a clinical training workspace. It should remain compact,
clear, and oriented toward the next decision.

Default repair should fit the learner's immediate need:

- What was the answer?
- What clue decided it?
- Why did my answer not fit?
- What should I recognize next time?

Expanded teaching belongs in Teach Me More. Progress and analytics belong behind
the training flow.

## Future Vision

Future work should extend the existing architecture rather than create parallel
systems. New specialties should add curriculum nodes, mappings, comparison
templates, illness scripts, decision boundaries, and tests.

The long-term direction is an adaptive clinical reasoning tutor that can connect
questions, concepts, shelves, errors, and review plans into a coherent learning
trajectory.
