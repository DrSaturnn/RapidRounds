# RFC Implementation Audit

This document audits RFC-001 through RFC-018 against the current RapidRounds
repository. It is documentation only. It does not define a new RFC, change
runtime behavior, or alter the governing product principles in
[PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md).

RapidRounds currently implements a substantial v1 prototype of the adaptive
clinical reasoning engine. The strongest areas are answer evaluation, decision
repair, Teach Me More structure, curriculum graph scaffolding, persistent
anonymous learner progress, and production readiness. The largest remaining
gap is that the canonical adaptive architecture is not yet a full learner-state
and mastery engine; it is represented by progress events, conservative
completion avoidance, reasoning-memory coaching, and deterministic learning
trajectory helpers.

## Audit Notes

- The checked-in `rfc/` directory contains substantive documents for RFC-001,
  RFC-017, and RFC-018.
- RFC-002 through RFC-005 exist locally as placeholder or empty files.
- RFC-006 through RFC-016 are not checked into `rfc/`; their requirements are
  represented by runtime code, tests, and prior implementation work.
- The local file `rfc/RFC-005 Pertinent Negative Recognition.md` conflicts with
  the implemented thread-level RFC-005, which was Production Readiness Cleanup.
  This audit uses the implemented product history and test coverage as the
  source of truth, while noting the documentation mismatch.

## Summary Matrix

| RFC | Title | Status | Runtime | UI | Tests | Remaining Gap | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RFC-001 | Universal Answer Intelligence | Complete | Yes | Indirect | Yes | Broader specialty alias coverage | Low |
| RFC-002 | Decision Repair | Mostly implemented | Yes | Yes | Yes | More authored specialty-specific repairs | Medium |
| RFC-003 | Decision Boundary Repair | Mostly implemented | Yes | Yes | Yes | More boundary mappings beyond current seed set | High |
| RFC-004 | Unknown State Detection | Complete | Yes | Yes | Yes | None material | Low |
| RFC-005 | Production Readiness Cleanup | Complete | Yes | Minimal | Yes | RFC filename mismatch in `rfc/` | Medium |
| RFC-006 | Teach Me More Content Correction | Mostly implemented | Yes | Yes | Yes | More authored comparison content | Medium |
| RFC-007 | Teach Me More Architecture v2 | Mostly implemented | Yes | Yes | Yes | Some modules still generated from generic fallbacks | Medium |
| RFC-008 | Cognitive Error Classification Engine | Partially implemented | Yes | Limited | Yes | No aggregate analytics view by error type | High |
| RFC-009 | Cross-Question Knowledge Graph | Mostly implemented | Yes | Yes | Yes | Concept chips are not yet a full graph browser | Medium |
| RFC-010 | Design System & Visual Language | Mostly implemented | No core logic | Yes | Yes | No full theme system or Observatory shell | Medium |
| RFC-011 | Intelligent Clinical Comparison Engine | Mostly implemented | Yes | Yes | Yes | Needs broader clinical comparison library | High |
| RFC-012 | Expert Illness Script Generator | Mostly implemented | Yes | Yes | Yes | Some scripts still depend on metadata quality | Medium |
| RFC-013 | Zero-Friction Training Flow | Mostly implemented | Yes | Yes | Yes | Resume is local session based, not a full server queue | Medium |
| RFC-014 | Decision Repair Information Hierarchy | Complete | Yes | Yes | Yes | None material | Low |
| RFC-015 | Adaptive Learning Trajectory | Partially implemented | Yes | Yes | Yes | No full scheduler, spacing, or mastery model | High |
| RFC-016 | Master Curriculum Graph | Mostly implemented | Yes | Yes | Yes | Mapping is incomplete for all future specialties | High |
| RFC-017 | Canonical Learner State Engine | Prototype only | Yes | Minimal | Yes | No canonical mastery estimates or learner-state service | Critical |
| RFC-018 | Adaptive Learning Architecture | Prototype only | Yes | Yes | Yes | No full adaptive decision engine or decision objects | Critical |

## RFC Details

### RFC-001: Universal Answer Intelligence

**Architectural purpose:** Provide a shared answer-evaluation gateway that
normalizes learner responses and classifies answer quality without relying only
on exact string matching.

**Implementation status:** Complete.

**Runtime files involved:** `lib/answer-check.ts`, `lib/ai-answer-check.ts`,
`app/api/practice/answer/route.ts`, `types/practice.ts`.

**UI files involved:** `components/PracticePanel.tsx` consumes the result
indirectly through API responses.

**Tests involved:** `tests/answer-check.test.ts`,
`tests/decision-repair.test.ts`, `tests/educational-assembly.test.ts`.

**Complete:** Normalization, accepted answer aliases, conservative spelling
variation, partial credit, task mismatch, unknown detection, and legacy
`compareAnswer` compatibility are implemented. The answer API returns structured
evaluation while preserving top-level answer result fields.

**Partial:** Optional AI-assisted equivalence exists through
`compareAnswerWithAI`, but deterministic matching remains the auditable base.

**Missing:** Broader concept alias coverage for future specialties.

**Superseded by later RFCs:** Later RFCs consume this classification but do not
replace it.

### RFC-002: Decision Repair

**Architectural purpose:** Convert missed answers into concise clinical repair
instead of generic explanation.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/tutor-content.ts`,
`lib/decision-education.ts`, `lib/reasoning-engine.ts`,
`lib/cognitive-error.ts`, `app/api/practice/answer/route.ts`,
`app/api/practice/tutor/route.ts`.

**UI files involved:** `components/TutorMode.tsx`,
`components/TeachingCard.tsx`, `components/PracticePanel.tsx`,
`app/globals.css`.

**Tests involved:** `tests/decision-repair.test.ts`,
`tests/decision-repair-hierarchy.test.ts`,
`tests/decision-education.test.ts`.

**Complete:** Decision Repair shows pivot clue, correct action, expert
reasoning, optional focused follow-up, and pattern coaching when prior learner
history supports it.

**Partial:** Repair language is decision-type aware, but many specialties still
depend on deterministic templates rather than fully authored repair content.

**Missing:** A broader authored library of specialty-specific repair patterns.

**Superseded by later RFCs:** RFC-014 supersedes the visible repair hierarchy;
RFC-008 keeps cognitive labels internal rather than foregrounding them.

### RFC-003: Decision Boundary Repair

**Architectural purpose:** Teach where a clinically adjacent wrong answer
belongs instead of treating it as random.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/decision-boundary-repair.ts`,
`lib/tutor-content.ts`, `lib/educational-assembly.ts`,
`lib/clinical-comparison.ts`.

**UI files involved:** `components/TutorMode.tsx`.

**Tests involved:** `tests/decision-repair.test.ts`,
`tests/clinical-comparison.test.ts`.

**Complete:** Explicit mappings cover the required examples: magnesium sulfate
versus severe-range BP treatment, placenta increta versus retained placenta,
and emergency cesarean versus immediate cord prolapse maneuver.

**Partial:** The helper is intentionally small and explicit.

**Missing:** More authored nearby-correct contexts across specialties.

**Superseded by later RFCs:** RFC-011 improves comparison quality; RFC-018
defines how future adaptive decisions should use boundary evidence.

### RFC-004: Unknown State Detection

**Architectural purpose:** Distinguish "I do not know" from an incorrect
clinical decision and provide concept-building instead of decision repair.

**Implementation status:** Complete.

**Runtime files involved:** `lib/answer-check.ts`, `lib/tutor-content.ts`,
`lib/educational-assembly.ts`, `app/api/practice/answer/route.ts`.

**UI files involved:** `components/PracticePanel.tsx`,
`components/TutorMode.tsx`.

**Tests involved:** `tests/answer-check.test.ts`,
`tests/decision-repair.test.ts`,
`tests/educational-assembly.test.ts`,
`tests/persistent-learner-state.test.ts`.

**Complete:** Blank, whitespace, `idk`, unsure, pass, and similar answers are
classified as `UNKNOWN`. Blank submissions are allowed. Unknown responses
receive concept-building and do not trigger Decision Boundary Repair or scored
UserStats completion.

**Partial:** None material.

**Missing:** None material for current requirements.

**Superseded by later RFCs:** RFC-017 clarifies unknowns should not be treated
as reasoning failures in durable learner state.

### RFC-005: Production Readiness Cleanup

**Architectural purpose:** Stabilize the deployed prototype for early external
testers and production Postgres.

**Implementation status:** Complete.

**Runtime files involved:** `prisma/schema.prisma`, `prisma/seed.ts`,
`app/api/health/route.ts`, `app/api/questions/next/route.ts`,
`app/page.tsx`, `app/analytics/page.tsx`, `lib/prisma.ts`.

**UI files involved:** `components/PracticePanel.tsx` for the empty seeded
database diagnostic.

**Tests involved:** `tests/production-readiness.test.ts`,
`tests/persistent-learner-state.test.ts`.

**Complete:** Prisma uses PostgreSQL, health endpoint exists, production seed
preserves learner progress, Prisma-backed routes are dynamic where needed, and
empty-state diagnostics exist.

**Partial:** Local RFC documentation is inconsistent; the checked-in RFC-005
file is empty and titled differently from the implemented sprint.

**Missing:** A checked-in RFC-005 document matching production readiness.

**Superseded by later RFCs:** Later learner-state work depends on this
production persistence foundation.

### RFC-006: Teach Me More Content Correction

**Architectural purpose:** Keep comparison-table content medically meaningful
and separate objective comparisons from learner error analysis.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/tutor-content.ts`,
`lib/clinical-comparison.ts`, `lib/display-language.ts`,
`lib/educational-assembly.ts`.

**UI files involved:** `components/TutorMode.tsx`,
`components/TeachingCard.tsx`.

**Tests involved:** `tests/decision-repair.test.ts`,
`tests/clinical-comparison.test.ts`,
`tests/educational-assembly.test.ts`.

**Complete:** Generic placeholder phrases are excluded from comparison output.
Strong authored comparisons render; weak fallback comparison rows are omitted.
Learner-specific "why tempting" content is separate from table cells.

**Partial:** Only a limited library of authored comparisons exists.

**Missing:** Full specialty-wide comparison coverage.

**Superseded by later RFCs:** RFC-007 standardizes Teach Me More structure;
RFC-011 raises the comparison-quality bar.

### RFC-007: Teach Me More Architecture v2

**Architectural purpose:** Standardize Teach Me More around illness script,
expert recognition, comparison, NBME pivot, and optional tempting-answer
analysis.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/tutor-content.ts`,
`lib/educational-assembly.ts`, `lib/expert-illness-script.ts`,
`lib/clinical-comparison.ts`.

**UI files involved:** `components/TutorMode.tsx`,
`components/TeachingCard.tsx`, `app/globals.css`.

**Tests involved:** `tests/decision-repair.test.ts`,
`tests/structured-teaching-blocks.test.ts`,
`tests/two-pane-workspace.test.ts`.

**Complete:** Teach Me More renders selected structured blocks and preserves
the standard sections when selected by the teaching plan. The current UI uses
scannable blocks rather than paragraph-heavy content.

**Partial:** Dynamic module selection means not every panel displays every
section; this is intentional after later educational-assembly work.

**Missing:** More authored content to make every selected section feel
attending-quality across specialties.

**Superseded by later RFCs:** Educational Engine 2 and recent UI evolution work
refine RFC-007 by gating modules through `teachingPlan`.

### RFC-008: Cognitive Error Classification Engine

**Architectural purpose:** Classify why a learner missed a decision, not only
what they missed.

**Implementation status:** Partially implemented.

**Runtime files involved:** `lib/cognitive-error.ts`,
`lib/reasoning-engine.ts`, `lib/reasoning-memory.ts`,
`lib/tutor-content.ts`, `app/api/practice/answer/route.ts`,
`prisma/schema.prisma`.

**UI files involved:** `components/TutorMode.tsx` surfaces learner-facing
pattern coaching, not raw labels.

**Tests involved:** `tests/decision-repair.test.ts`,
`tests/reasoning-memory.test.ts`,
`tests/persistent-learner-state.test.ts`.

**Complete:** Incorrect and partial attempts can receive a primary cognitive
error; correct answers do not. Cognitive error type and reasoning pattern are
persisted. Repeated patterns can produce learner-facing coaching.

**Partial:** Analytics do not yet aggregate cognitive errors for learner review.
The taxonomy is deterministic and small.

**Missing:** Full reasoning-error analytics, trend reporting, and adaptive
weighting based on error history.

**Superseded by later RFCs:** RFC-014 supersedes the original idea of showing
"Cognitive Error" prominently in Decision Repair.

### RFC-009: Cross-Question Knowledge Graph

**Architectural purpose:** Connect decisions into reusable concept
relationships instead of isolated questions.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/concept-graph.ts`,
`lib/learning-trajectory.ts`, `lib/curriculum-graph.ts`,
`lib/curriculum-resolution.ts`.

**UI files involved:** `components/TutorMode.tsx` through Next Challenge and
optional exploration chips.

**Tests involved:** `tests/concept-graph.test.ts`,
`tests/learning-trajectory.test.ts`,
`tests/curriculum-graph.test.ts`.

**Complete:** Primary concepts, related concepts, management concepts, and
Continue Learning recommendations are available for current seed concepts.

**Partial:** The original "Related Concepts" surface has evolved into "Next
challenge" and optional exploration, which better matches RFC-015.

**Missing:** A full learner-facing graph browser or concept map.

**Superseded by later RFCs:** RFC-015 replaces passive related concepts with
actionable Continue Learning; RFC-016 introduces the master curriculum graph.

### RFC-010: Design System & Visual Language

**Architectural purpose:** Establish a coherent visual language for clinical
reasoning surfaces.

**Implementation status:** Mostly implemented.

**Runtime files involved:** No educational runtime logic.

**UI files involved:** `app/globals.css`, `tailwind.config.ts`,
`components/Button.tsx`, `components/TeachingCard.tsx`,
`components/TutorMode.tsx`, `components/PracticePanel.tsx`,
`components/QuestionMeta.tsx`.

**Tests involved:** `tests/design-system.test.ts`,
`tests/two-pane-workspace.test.ts`,
`tests/structured-teaching-blocks.test.ts`.

**Complete:** Semantic color tokens, card/button/input styles, repair surfaces,
Teach Me More blocks, recognition pathways, two-pane desktop workspace, and
mobile learning flow exist.

**Partial:** The Observatory identity is documented but not implemented as a
full persistent environment.

**Missing:** Theme variants, high-contrast/dark modes, full Observatory shell,
and broader visual QA.

**Superseded by later RFCs:** Product Blueprint and UI Evolution sprints refine
the design direction without changing RFC-010's foundation.

### RFC-011: Intelligent Clinical Comparison Engine

**Architectural purpose:** Use diagnosis-specific discriminators instead of
generic comparison filler.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/clinical-comparison.ts`,
`lib/display-language.ts`, `lib/tutor-content.ts`,
`lib/educational-assembly.ts`.

**UI files involved:** `components/TutorMode.tsx`.

**Tests involved:** `tests/clinical-comparison.test.ts`,
`tests/decision-repair.test.ts`,
`tests/structured-teaching-blocks.test.ts`.

**Complete:** Current comparison templates include high-yield pairs such as
gestational hypertension versus preeclampsia, placental abruption versus
placenta previa, Category I versus Category II tracing, candidiasis versus BV,
and carboprost versus methylergonovine contraindications. Weak fallback tables
are omitted.

**Partial:** The engine is architecture-ready but content-limited.

**Missing:** Broad specialty-agnostic template coverage.

**Superseded by later RFCs:** RFC-018 frames comparisons as adaptive
educational actions selected from evidence.

### RFC-012: Expert Illness Script Generator

**Architectural purpose:** Generate concise expert mental models rather than
dictionary definitions.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/expert-illness-script.ts`,
`lib/tutor-content.ts`.

**UI files involved:** `components/TutorMode.tsx`.

**Tests involved:** `tests/expert-illness-script.test.ts`,
`tests/decision-repair.test.ts`.

**Complete:** Illness scripts avoid definition-style openings and target short
expert pattern-recognition paragraphs.

**Partial:** Script quality depends heavily on available decision metadata.

**Missing:** Broader authored illness-script templates for future specialties.

**Superseded by later RFCs:** RFC-007 and structured teaching blocks define how
illness scripts render.

### RFC-013: Zero-Friction Training Flow

**Architectural purpose:** Make practice the default landing experience and
preserve session momentum.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `app/page.tsx`, `app/practice/page.tsx`,
`hooks/usePracticeSession.ts`, `app/api/questions/next/route.ts`.

**UI files involved:** `components/PracticePanel.tsx`.

**Tests involved:** `tests/zero-friction-flow.test.ts`,
`tests/persistent-learner-state.test.ts`.

**Complete:** Home renders practice directly, session state persists locally,
anonymous learner ID is stable per browser/device, and the app resumes the
active training session.

**Partial:** Adaptive queue position is local and simple.

**Missing:** Server-side active-session queue and full cross-device resume.

**Superseded by later RFCs:** RFC-017 defines how session state should relate
to durable learner state.

### RFC-014: Decision Repair Information Hierarchy

**Architectural purpose:** Put the correct answer and deciding clue before
internal analytics or secondary teaching.

**Implementation status:** Complete.

**Runtime files involved:** `lib/tutor-content.ts`,
`lib/decision-education.ts`.

**UI files involved:** `components/TutorMode.tsx`, `app/globals.css`.

**Tests involved:** `tests/decision-repair-hierarchy.test.ts`,
`tests/decision-repair.test.ts`.

**Complete:** Repair panels foreground pivot clue and correct action. Cognitive
error labels are not shown as the main repair UI.

**Partial:** None material.

**Missing:** None material for current requirements.

**Superseded by later RFCs:** Current structured UI preserves this hierarchy.

### RFC-015: Adaptive Learning Trajectory

**Architectural purpose:** Convert passive related concepts into actionable
Continue Learning recommendations.

**Implementation status:** Partially implemented.

**Runtime files involved:** `lib/learning-trajectory.ts`,
`lib/concept-graph.ts`, `lib/curriculum-graph.ts`,
`app/api/questions/next/route.ts`.

**UI files involved:** `components/TutorMode.tsx`.

**Tests involved:** `tests/learning-trajectory.test.ts`,
`tests/concept-graph.test.ts`,
`tests/curriculum-graph.test.ts`.

**Complete:** Continue Learning recommends a next challenge, explains why, and
lets the learner optionally explore related concepts. Question selection can
use a requested concept and avoid already completed decisions.

**Partial:** The recommendation logic is deterministic and shallow.

**Missing:** No full scheduler, spacing intervals, mastery estimates, or
confidence-aware adaptive planning.

**Superseded by later RFCs:** RFC-018 defines the future adaptive engine that
should eventually replace the lightweight trajectory helper.

### RFC-016: Master Curriculum Graph

**Architectural purpose:** Organize clinical decisions by patient context,
shelf relevance, cross-disciplinary overlap, and decision boundaries.

**Implementation status:** Mostly implemented.

**Runtime files involved:** `lib/curriculum-graph.ts`,
`lib/curriculum-resolution.ts`, `lib/learning-trajectory.ts`,
`app/api/practice/answer/route.ts`.

**UI files involved:** `components/TutorMode.tsx` through Continue Learning.

**Tests involved:** `tests/curriculum-graph.test.ts`,
`tests/learning-trajectory.test.ts`,
`tests/persistent-learner-state.test.ts`.

**Complete:** Curriculum nodes include shelf tags, clinical context tags,
discipline tags, decision type tags, parent/prerequisite/successor/related
links, common distractors, and priorities. Pregnancy includes OB, IM, surgery,
psychiatry, pediatrics/neonatology, family medicine, and ethics branches.
Runtime progress stores curriculum node, shelf tags, and discipline tags when
available.

**Partial:** Existing seed decisions map through a resolver and explicit maps,
but not every possible specialty or future question has rich authored mapping.

**Missing:** Complete cross-shelf map for all shelves and all future content.

**Superseded by later RFCs:** RFC-017 and RFC-018 depend on this graph but do
not replace it.

### RFC-017: Canonical Learner State Engine

**Architectural purpose:** Define the durable learner model: evidence,
mastery, confidence, misconceptions, reasoning patterns, session state, and
longitudinal state.

**Implementation status:** Prototype only.

**Runtime files involved:** `prisma/schema.prisma`,
`app/api/practice/answer/route.ts`, `app/api/questions/next/route.ts`,
`hooks/usePracticeSession.ts`, `lib/learner-id.ts`,
`lib/reasoning-memory.ts`, `lib/curriculum-resolution.ts`.

**UI files involved:** `components/TutorMode.tsx` for lightweight pattern
coaching; `components/PracticePanel.tsx` for saved session flow.

**Tests involved:** `tests/persistent-learner-state.test.ts`,
`tests/reasoning-memory.test.ts`, `tests/zero-friction-flow.test.ts`.

**Complete:** Anonymous learner identity is stable per browser/device. Progress
events persist in Postgres with answer, expected answer, outcome,
classification, partial credit, confidence, cognitive error, reasoning pattern,
repair type, decision type, curriculum node, shelf tags, and discipline tags.
Completed decisions can be read later and avoided when alternatives exist.

**Partial:** This is an event-log and conservative memory slice, not a canonical
learner-state service.

**Missing:** Mastery estimates, confidence calibration, misconception models,
repair effectiveness, longitudinal state derivation, migration path from
anonymous learner to authenticated learner, and cross-device identity.

**Superseded by later RFCs:** RFC-018 depends on RFC-017 and defines how this
state should drive adaptive actions.

### RFC-018: Adaptive Learning Architecture

**Architectural purpose:** Define how learner evidence should become adaptive
educational actions.

**Implementation status:** Prototype only.

**Runtime files involved:** `lib/learning-trajectory.ts`,
`lib/educational-assembly.ts`, `lib/reasoning-memory.ts`,
`app/api/questions/next/route.ts`, `app/api/practice/answer/route.ts`.

**UI files involved:** `components/TutorMode.tsx`,
`components/PracticePanel.tsx`.

**Tests involved:** `tests/learning-trajectory.test.ts`,
`tests/educational-assembly.test.ts`,
`tests/reasoning-memory.test.ts`,
`tests/two-pane-workspace.test.ts`,
`tests/structured-teaching-blocks.test.ts`.

**Complete:** The runtime selects teaching modules by repair type, surfaces
learner-specific pattern coaching when evidence is sufficient, recommends a
next challenge, and can request a target concept for the next question.

**Partial:** These are deterministic helper layers, not a full Adaptive
Decision Engine.

**Missing:** Canonical Decision Objects, action scoring, mastery-aware
selection, delayed retrieval scheduling, explainable adaptive traces, and a
single adaptive engine consuming canonical learner state.

**Superseded by later RFCs:** None. This is the current umbrella architecture.

## Dependency List

- RFC-001 is the foundation for RFC-002, RFC-004, RFC-008, RFC-017, and
  RFC-018.
- RFC-002 depends on RFC-001 and supports RFC-003, RFC-006, RFC-008, RFC-014,
  and RFC-018.
- RFC-003 depends on RFC-001 and RFC-002; it is strengthened by RFC-011.
- RFC-004 depends on RFC-001 and changes how RFC-002 and RFC-017 treat unknown
  responses.
- RFC-005 supports all production persistence and deployment-dependent RFCs.
- RFC-006 and RFC-007 depend on RFC-002 and feed the Teach Me More architecture.
- RFC-008 depends on RFC-001 and RFC-002; it feeds RFC-017 and RFC-018.
- RFC-009 depends on concept relationships and is broadened by RFC-016.
- RFC-010 affects the UI expression of RFC-002, RFC-007, RFC-014, RFC-015, and
  RFC-018.
- RFC-011 depends on RFC-006 and RFC-007.
- RFC-012 depends on question metadata and feeds RFC-007.
- RFC-013 depends on RFC-005 and supports RFC-017 session state.
- RFC-014 supersedes earlier repair-screen hierarchy decisions in RFC-002 and
  RFC-008.
- RFC-015 depends on RFC-009 and is expanded by RFC-016 and RFC-018.
- RFC-016 provides the graph substrate for RFC-015, RFC-017, and RFC-018.
- RFC-017 depends on RFC-001, RFC-004, RFC-008, RFC-013, and RFC-016.
- RFC-018 depends on RFC-017 and consumes RFC-006, RFC-007, RFC-011, RFC-015,
  and RFC-016.

## Top Remaining Gaps

| Rank | Gap | Educational Impact | Implementation Effort | Architectural Risk |
| --- | --- | --- | --- | --- |
| 1 | Canonical Learner State Engine beyond persisted Progress events | Very high | High | Critical |
| 2 | Adaptive Decision Engine with explainable action selection | Very high | High | Critical |
| 3 | Mastery estimates and delayed retrieval scheduling | Very high | High | High |
| 4 | Broader authored decision-boundary mappings | High | Medium | High |
| 5 | Broader clinical comparison template library | High | Medium | Medium |
| 6 | Specialty-wide illness script and repair authoring | High | Medium | Medium |
| 7 | Cognitive-error analytics and trend surfaces | Medium-high | Medium | Medium |
| 8 | Full anonymous-to-authenticated learner migration path | Medium-high | High | High |
| 9 | Complete cross-shelf curriculum mapping for non-OB/GYN content | Medium-high | High | Medium |
| 10 | Observatory product shell and calmer long-session environment | Medium | High | Low |

## Next Recommended Sprints

1. **Learner State Service Slice**
   - Create a read-only learner-state aggregation layer over existing Progress
     events.
   - Compute per-concept attempts, last seen, recent misses, repeated reasoning
     patterns, and confidence summaries.
   - Do not change schema unless required.

2. **Adaptive Action Trace Slice**
   - Add an internal adaptive recommendation object that explains why the next
     action was selected.
   - Keep the current Next Challenge UI, but make the reason traceable to
     learner evidence and curriculum relationships.

3. **Decision Boundary Content Expansion**
   - Add a small set of explicit high-yield boundaries for current OB/GYN seed
     content.
   - Require tests for every new boundary.

4. **Comparison and Illness Script Authoring Pass**
   - Expand `clinical-comparison` and illness-script coverage for the highest
     frequency seed concepts.
   - Continue omitting weak fallback sections.

5. **Cognitive Error Analytics Foundation**
   - Add aggregate queries for cognitive error patterns without redesigning the
     analytics UI.
   - Keep raw cognitive labels out of default repair.

## Required Area Evaluation

### Answer Intelligence

Aligned and implemented. The current evaluation layer provides structured
classification and remains compatible with existing API/UI behavior.

### Decision Repair

Aligned and mostly implemented. Repair is concise, clue-first, and
learner-facing. More authored specialty-specific repair text would reduce
template feel.

### Decision Boundary Repair

Aligned and mostly implemented. The mechanism is explicit and testable, but
coverage is intentionally narrow.

### Unknown State

Aligned and implemented. Unknown responses receive concept-building and do not
count as reasoning failures.

### Production Readiness

Aligned and implemented for the current prototype. PostgreSQL, health checks,
safe seed behavior, dynamic routes, and empty-state diagnostics are present.

### Teach Me More

Aligned and mostly implemented. Teach Me More is structured and selected by
teaching plan. The main gap is authored content depth across more topics.

### Cognitive Error Engine

Partially implemented. Classification and persistence exist, but the analytics
and adaptive weighting envisioned by the RFC are not complete.

### Knowledge/Curriculum Graph

Mostly implemented. Concept graph and master curriculum graph exist and feed
Continue Learning. The graph is not yet complete for all future shelves.

### Design System

Mostly implemented. Semantic tokens, calm clinical cards, structured teaching
blocks, and responsive post-answer workspace exist. Observatory is still
documented rather than implemented.

### Zero-Friction Flow

Mostly implemented. The app opens into practice and resumes local session
state. Full server-side session continuity is not complete.

### Adaptive Learning Trajectory

Partially implemented. Continue Learning and conservative next-concept
selection exist, but no full scheduler or mastery-aware planner exists.

### Curriculum Graph

Mostly implemented. The pregnancy graph demonstrates cross-disciplinary shelf
overlays and runtime curriculum metadata resolution.

### Learner State Engine

Prototype only. Progress persistence and reasoning memory are the first runtime
slice, not the full canonical engine.

### Adaptive Learning Architecture

Prototype only. Educational assembly and Continue Learning express adaptive
intent, but there is no single Adaptive Decision Engine or Decision Object
model yet.

## Alignment With PROJECT_CONSTITUTION.md

The current implementation broadly aligns with the Constitution:

- RapidRounds opens into training rather than a dashboard.
- Each RapidRound is modeled as one primary clinical decision.
- Decision Repair foregrounds pivot clue and correct action.
- Cognitive error labels are internal by default.
- Unknown responses receive concept-building.
- Teach Me More is structured and scannable.
- Comparison tables suppress placeholder implementation text.
- Continue Learning is actionable rather than passive.
- Shelves are represented as filtered views over a curriculum graph.
- Production uses Postgres rather than local SQLite assumptions.

The main constitutional risk is not contradiction but incompleteness: the
runtime does not yet have a full canonical learner state engine or adaptive
decision engine. Current adaptive behavior is real but limited, implemented as
deterministic helper layers over persisted progress and curriculum metadata.

