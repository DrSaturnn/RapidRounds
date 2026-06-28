# 001 Aster Initialization Protocol

This document is a principal-engineer handoff for the next long-term
architectural authority for RapidRounds. It is written to let another senior AI
architect become productive immediately without rereading the whole repository.

It is not a product pitch. It is not an RFC. It is the current implementation
map, architectural memory, invariant list, and known-risk register.

## 0. Executive Orientation

RapidRounds is an adaptive clinical reasoning engine. Treat it as an education
runtime, not as a question bank UI.

The core loop is:

```text
clinical decision
-> free-response answer
-> deterministic answer evaluation
-> Decision Repair / concept build
-> Teach Me More, optional
-> Continue Learning / adaptive next decision
```

The engine is the product. Presentation layers are allowed to change how the
experience feels, but they must never change grading, learner state, tutor
logic, or adaptive sequencing.

The repo is a Next.js App Router app with Prisma/Postgres persistence,
deterministic answer evaluation, tutor content assembly, curriculum graph
scaffolding, anonymous learner progress, and theme-driven presentation
adapters.

Important current state:

- The checked-in `rfc/` directory only contains RFC-001 through RFC-005 and
  RFC-017 through RFC-018.
- Many RFC-006 through RFC-016 behaviors exist in runtime code and tests, but
  their RFC source files are not checked in.
- `docs/RFC_IMPLEMENTATION_AUDIT.md` is the best current map of RFC status.
- `docs/PROJECT_CONSTITUTION.md` is the governing product architecture.
- `docs/DESIGN_CONSTITUTION.md` and `docs/design-system.md` define theme
  inheritance rules.
- The most recent stabilization work made the Moleskine Notebook theme a
  presentation adapter and added regression tests proving it shares the
  canonical answer path.

## 1. Repository Structure

### Top-Level Folders

```text
app/          Next.js App Router pages and API routes.
components/   Client UI components and presentation adapters.
database/     Data-access helpers for seeded clinical decisions/questions.
docs/         Product, architecture, design, audit, and workflow docs.
hooks/        Client-side state machines, especially practice session state.
lib/          Core educational engine, adaptive logic, serialization, graphs.
prisma/       Prisma schema and seed content.
rfc/          Checked-in RFC documents, incomplete relative to product history.
tests/        Node test-runner behavioral contract tests.
types/        Shared TypeScript DTOs and runtime types.
artifacts/    Generated or local artifacts, not core runtime architecture.
```

### App Entry Points

- `app/page.tsx`
  - Home route. Currently practice-first per zero-friction training flow.
- `app/practice/page.tsx`
  - Practice route. Renders the practice surface.
- `app/analytics/page.tsx`
  - Secondary analytics/progress surface.
- `app/api/questions/next/route.ts`
  - Returns the next question/clinical decision. Integrates persisted learner
    progress, adaptive decision recommendation, subject filtering, and fallback
    question selection.
- `app/api/practice/answer/route.ts`
  - Canonical answer-scoring endpoint. This is the core engine boundary for
    submitted answers.
- `app/api/practice/tutor/route.ts`
  - Tutor content endpoint for teaching mode.
- `app/api/health/route.ts`
  - Safe production health endpoint with database connectivity and question
    count.
- `app/api/subjects/route.ts`
  - Subject/shelf counts for the real subject selector.

### Core Component Hierarchy

Current primary runtime UI:

```text
PracticePanel
  -> usePracticeSession
  -> top bar / subject selector / theme menu / Aster drawer shell
  -> solve state question input
  -> TutorMode after answer/tutor state
  -> TeachingCard for collapsible Teach Me More
  -> Button, QuestionMeta, EmptyState primitives
```

Warm Notebook / Moleskine presentation path:

```text
PracticePanel
  if skin === "warm-notebook":
    MoleskinePracticeLayout
      MoleskineShell
        MoleskineSidebar
        MoleskineNotebookSpread
          solve:
            MoleskineLeftPage
              vignette/question/input/submit
            MoleskineRightPage
              quiet placeholder
          learn:
            TutorMode presentation="moleskine"
              MoleskineTeachingDocument
                left:
                  rr-moleskine-left-page
                    vignette/question
                    MoleskineReasoningChain
                    RepairSummary
                    VignetteAttentionMap
                    written teaching facts
                    reinforcement, if present
                right:
                  RightPanelExplanation presentation="moleskine"
                  MoleskineClinicalPearl
                  MoleskineTeachMeMore
                  secondary Next Challenge
        MoleskineFooterActions
```

Non-Moleskine themes use the existing/default practice layout in
`PracticePanel` and the default `TutorMode` workspace.

### Module Ownership

Use this ownership model when changing code:

- `lib/answer-check.ts`
  - Owns deterministic grading semantics.
  - Do not put grading logic in components.
- `lib/ai-answer-check.ts`
  - Optional AI equivalence support. It is bounded and secondary.
- `app/api/practice/answer/route.ts`
  - Owns answer submission orchestration, progress writes, UserStats updates,
    tutor construction, learner-state coaching injection.
- `lib/tutor-content.ts`
  - Owns Decision Repair and Teach Me More content assembly.
- `lib/educational-assembly.ts`
  - Owns teaching-plan/module selection by repair type.
- `lib/decision-education.ts`
  - Owns decision-type-aware repair language.
- `lib/decision-boundary-repair.ts`
  - Owns explicit nearby-correct decision boundary mappings.
- `lib/clinical-comparison.ts`
  - Owns comparison table content and filler suppression.
- `lib/cognitive-error.ts`, `lib/reasoning-engine.ts`
  - Own internal reasoning/cognitive classifications.
- `lib/learner-state.ts`
  - Owns read-only learner-state summaries from `Progress`.
- `lib/adaptive-decision.ts`
  - Owns conservative adaptive next-decision selection.
- `lib/learning-trajectory.ts`
  - Owns Continue Learning/next challenge recommendations.
- `lib/curriculum-graph.ts`, `lib/curriculum-resolution.ts`
  - Own curriculum graph nodes, shelf overlays, mapping, and runtime resolution.
- `lib/clinical-decision-serializers.ts`, `lib/serializers.ts`
  - Own DTO conversion from Prisma/seed models to practice DTOs.
- `lib/rapidrounds-case.ts`, `lib/ectopic-pregnancy-variants.ts`
  - Own illness-script variant metadata and pilot cases.
- `hooks/usePracticeSession.ts`
  - Owns client-side practice session state, anonymous learner ID, local
    session persistence, answer input state, API calls.
- `components/PracticePanel.tsx`
  - Owns runtime presentation shell, theme adapter branching, top bar/sidebar,
    subject selector, notes UI, Aster drawer shell.
- `components/TutorMode.tsx`
  - Owns learner-facing repair/teaching rendering.
- `components/TeachingCard.tsx`
  - Owns collapsible Teach Me More presentation behavior.
- `app/globals.css`
  - Owns Tailwind layer classes, theme variables, and theme-specific material
    treatments.
- `prisma/seed.ts`
  - Owns current authored clinical-decision content and seed behavior.

## 2. Current Engine

### Data Model

`prisma/schema.prisma` uses PostgreSQL.

Core models:

- `ClinicalDecision`
  - Primary current content model.
  - Fields include `specialty`, `system`, `topic`, `clinicalPattern`,
    `decisionType`, `prompt`, `acceptedAnswers`, `boardPearl`, `pivotClue`,
    `commonTrap`, `managementPearl`, `relatedDecisionIds`, `difficulty`, `tags`.
  - `acceptedAnswers`, `relatedDecisionIds`, and `tags` are JSON strings, not
    normalized relational tables.
- `Question`
  - Older/legacy question model.
  - Still supported as fallback in answer and next-question routes.
- `Progress`
  - Event-like persistent learner attempt record.
  - Stores `userId` anonymous learner ID, answer, correctness, expected answer,
    answer outcome, evaluation classification, partial credit, confidence,
    cognitive error type, reasoning pattern, repair type, decision type,
    curriculum node, shelf/discipline tags, response time, diagnosis,
    management, pattern.
- `UserStats`
  - Aggregate basic stats keyed by `userId`.
  - Unknown attempts do not increment scored UserStats.
- `Topic`
  - Legacy relation for `Question`.

No profile/auth system exists. Anonymous learner identity is local to
browser/device.

### Learner State

Client-side:

- Implemented in `hooks/usePracticeSession.ts`.
- Anonymous learner ID is stored in localStorage under:
  - `rapidrounds.anonymousLearnerId.v1`
- Practice session state is stored in localStorage under:
  - `rapidrounds.practiceSession.v1`
- Active subject is stored under:
  - `rapidrounds.activeSubject.v1`
- Theme/skin is stored under:
  - `rapidrounds.practiceSkin.v2`
- Notes are stored per question locally:
  - `rr-notes-${question.id}`

Server-side:

- `Progress.userId` is the anonymous learner ID.
- All adaptive and learner-state summaries must be scoped to this ID.
- Missing learner IDs are handled safely; they must not create shared global
  progress.
- Production seed must update content in place and must not delete learner
  progress.

Read-only learner-state service:

- `lib/learner-state.ts`
- Computes summaries from `Progress` records:
  - total attempts
  - completed clinical decision IDs
  - attempts by concept/topic
  - attempts by decision type
  - recent misses
  - repeated reasoning patterns
  - cognitive error summaries
  - last-seen timestamps
  - recent accuracy by concept
  - confidence summaries
  - shelf/discipline/curriculum summaries
  - provisional mastery labels

Important: learner state is currently derived, not a canonical mastery store.
Do not treat it as a full learner-state engine.

### Answer Evaluation

Canonical evaluator:

- `lib/answer-check.ts`

Main exported functions:

- `normalizeAnswer(value)`
- `evaluateAnswer(input)`
- `compareAnswer(...)` legacy boolean API

`evaluateAnswer` handles:

- exact normalized match
- accepted aliases
- preferred terminology aliases
- conservative spelling variations
- broad-but-incomplete answers
- correct category / insufficient specificity
- task mismatch
- related but incorrect concepts
- unknown responses
- incorrect responses

Core classifications:

```ts
AnswerEvaluationClassification =
  | "EXACT"
  | "EQUIVALENT"
  | "SPELLING_VARIATION"
  | "TASK_MISMATCH"
  | "PARTIAL"
  | "INCORRECT"
  | "UNKNOWN"
  | "AMBIGUOUS";
```

High-level answer outcomes returned by API:

```ts
AnswerOutcome =
  | "CORRECT"
  | "DECISION_ERROR"
  | "PARTIAL"
  | "TASK_MISMATCH"
  | "UNKNOWN";
```

The answer API:

- `app/api/practice/answer/route.ts`
- Fetches the `ClinicalDecision` by `questionId`.
- Parses accepted answers from JSON.
- Chooses `correctAnswer = acceptedAnswers[0] ?? decision.topic`.
- Calls `evaluateAnswer`.
- Calls `compareAnswerWithAI` only when deterministic local evaluation is not
  correct and is not unknown.
- Applies AI equivalence only as an equivalent override.
- Builds `TutorContent` with `buildTutorContent`.
- Injects reasoning-memory coaching from `getLearnerState` and
  `buildReasoningMemoryCoaching`.
- Resolves curriculum context.
- Writes `Progress`.
- Updates `UserStats` for non-unknown attempts.
- Returns `AnswerResult`.

Recent release-safety test:

- `tests/presentation-adapter-regression.test.ts`
- Proves `transvaginal ultrasound` is correct under both default and
  warm-notebook/Moleskine paths.
- Proves aliases `TVUS`, `transvaginal US`, and
  `transvaginal ultrasonography` are accepted after seed update.
- Proves Moleskine components do not import or call grading logic.

### Semantic Matching / AI Matching

There is optional AI support:

- `lib/ai-answer-check.ts`
- `lib/openai.ts`

The deterministic evaluator remains the auditable foundation. AI is only used
as a bounded fallback for semantic equivalence when local evaluation is not
already correct and not unknown.

Do not make AI the primary grader without a new RFC-level contract and tests.

### Adaptive Sequencing

Next-question route:

- `app/api/questions/next/route.ts`

Flow:

1. Read `concept`, `subject`, `learnerId` from query.
2. If learner ID exists, fetch recent and completed progress.
3. Call `getAdaptiveDecisionRecommendation`.
4. If adaptive recommendation has a decision, return it.
5. Otherwise compute `adaptiveTarget` from requested concept or
   `getAdaptiveTargetConcept(answered)`.
6. Call `getNextClinicalDecision(answeredDecisionIds, adaptiveTarget,
   requestedSubject)`.
7. Fallback to legacy `Question` rows if no `ClinicalDecision` is available.

Adaptive decision service:

- `lib/adaptive-decision.ts`

Consumes:

- `getLearnerState`
- available `ClinicalDecision` rows
- curriculum resolution
- completed IDs
- requested concept and subject

Action types:

```ts
AdaptiveDecisionAction =
  | "continue_new_decision"
  | "reinforce_recent_miss"
  | "revisit_weak_concept"
  | "practice_related_decision"
  | "avoid_completed_if_possible";
```

This is conservative. It is not full spaced repetition, not a full planner, and
not a mastery scheduler.

Continue Learning:

- `lib/learning-trajectory.ts`
- Builds next challenges from concept graph/curriculum relationships and recent
  misses.
- UI renders as secondary next action, not blocking flow.

### Decision Repair

Assembly:

- `lib/tutor-content.ts`
- `lib/decision-education.ts`
- `lib/reasoning-engine.ts`
- `lib/cognitive-error.ts`

Rendering:

- `components/TutorMode.tsx`

Core `TutorContent` fields:

- `repair`
- `reasoningAnalysis`
- `cognitiveError`
- `vignetteFindings`
- `coaching`
- `teachingPlan`
- `correctAnswer`
- `whyIncorrect`
- `illnessScript`
- `managementPearl`
- `recognitionPath`
- `nbmePivot`
- `whyTempting`
- `comparison`
- `reinforcement`

Decision Repair principles currently encoded:

- Correct answer and pivot clue are foregrounded.
- Cognitive error labels are generated but not foregrounded in default repair.
- Unknown state gets concept-building, not punitive repair.
- Nearby-correct answers get boundary teaching if mapped.
- Correct answers should not show wrong-answer repair language.

### Teach Me More

Rendering:

- `components/TeachingCard.tsx`
- Used by `components/TutorMode.tsx`
- `defaultOpen={false}` is intentional and tested.

Content assembly:

- `lib/tutor-content.ts`
- `lib/educational-assembly.ts`
- `lib/clinical-comparison.ts`
- `lib/expert-illness-script.ts`

Standard sections:

- Illness Script
- Typical Patient, if meaningful metadata exists
- Recognition Goal, if meaningful metadata exists
- Expert Recognition
- Don't Confuse With / comparison, only when selected and specific
- NBME Pivot
- Why This Was Tempting, only when learner answer warrants it
- Board Pearl / management pearl, if non-duplicative

Important: Teach Me More is selected by `teachingPlan`. Do not force every
module to render for every answer. Dynamic Educational Assembly deliberately
omits irrelevant modules.

### Reasoning Diagnosis / Cognitive Errors

Internal reasoning components:

- `lib/reasoning-engine.ts`
- `lib/cognitive-error.ts`
- `lib/reasoning-memory.ts`

Reasoning errors:

- Knowledge Gap
- Pattern Recognition Error
- Missed Pivot Clue
- Management Sequencing Error
- Premature Closure
- Timeline Error
- Distractor Error
- Instability Error

Cognitive error types:

- Missed Pivot Clue
- Premature Closure
- Illness Script Confusion
- Management Error
- Contraindication Error
- Timing Error
- Severity Error
- Distractor Attraction
- Overgeneralization
- Knowledge Gap

Do not show raw cognitive error labels as the main learner-facing repair
surface. They are primarily adaptive/analytics inputs.

Reasoning memory:

- Recent attempts can produce learner-facing coaching like "pattern to watch".
- It must be scoped to anonymous learner ID.
- It must not expose another learner's data.

### Vignette Annotations / Clue Classification

Types:

```ts
VignetteFindingRole =
  | "context"
  | "supporting"
  | "pivot_clue"
  | "neutral"
  | "noise";
```

Source:

- Authored tags in `prisma/seed.ts`
- RapidRounds case metadata in `lib/rapidrounds-case.ts`
- Variant metadata in `lib/ectopic-pregnancy-variants.ts`

Parsing and assembly:

- `lib/tutor-content.ts`

Rendering:

- `components/TutorMode.tsx`
- `components/PracticePanel.tsx` via `AnnotatedClinicalPrompt`

Key rule: annotations are a teaching layer. They must never alter answer
evaluation.

### Illness-Script Variant Engine

Pilot:

- `lib/ectopic-pregnancy-variants.ts`
- `lib/rapidrounds-case.ts`
- `lib/clinical-decision-serializers.ts`

Concept:

```text
canonical illness script -> multiple reasoning variants
```

Current pilot script:

- `scriptId: "ectopic_pregnancy"`
- Ten variants:
  - recognition
  - diagnosis
  - next_best_step
  - stable_management
  - unstable_management
  - methotrexate_eligibility
  - rhogam_indication
  - differential_boundary
  - lab_interpretation
  - imaging_interpretation

These serialize into `ClinicalDecision`-compatible seed objects without schema
changes.

## 3. Presentation Architecture

### Theme System

Active themes:

- `modern-academic`
- `warm-notebook` (Moleskine Notebook)
- `dark-clinical`
- `editorial`

Theme selection:

- `PracticePanel` state `skin`
- persisted in localStorage key `rapidrounds.practiceSkin.v2`
- root applies `data-theme`

Theme rules:

- Modern Academic is default.
- Moleskine-specific material must be scoped under
  `[data-theme="warm-notebook"]`.
- Feature code should compose primitives and inherit theme presentation.
- Do not add new feature-specific theme patches unless creating a reusable
  primitive.

### Presentation Adapters

Default adapter:

- Used by `modern-academic`, `dark-clinical`, `editorial`.
- Renders existing `PracticePanel` layout and default `TutorMode` workspace.

Moleskine adapter:

- Activated only when `skin === "warm-notebook"`.
- Implemented in `PracticePanel` and `TutorMode`.
- Uses dedicated adapter components but canonical engine props/state.
- Does not own grading.

Critical recent stabilization:

- The original Moleskine attempt hosted the old layout, creating a huge blank
  area because the vignette page and reasoning chain were separate grid rows.
- Fixed by passing `moleskineLeftPageContent` into `TutorMode` and rendering
  `.rr-moleskine-left-reasoning` inside `.rr-moleskine-left-page`.
- Tests prevent reintroducing `display: contents` or `grid-row: 3` for the
  split left-page narrative.

### Rendering Pipeline

Client practice pipeline:

```text
PracticePanel
  -> usePracticeSession
  -> question/answer/result/tutor/mode
  -> choose presentation path by skin
  -> solve state:
       question + input + submit
  -> answer submitted:
       submitAnswer -> API -> AnswerResult + TutorContent
  -> learn/tutor state:
       TutorMode renders repair, teaching, next challenge
```

State ownership:

- `usePracticeSession` owns engine-facing state.
- `PracticePanel` owns presentation state:
  - skin
  - top/rail settings popovers
  - subject selector popover
  - Aster drawer open/closed
  - local notes panel
  - end-session confirmation
- `TutorMode` owns only local reinforcement answer handling passed from the
  hook.

### UI Authenticity Rules

Every visible control must do something real.

Current controls:

- Subject selector: real subject counts, disabled coming-soon subjects.
- Theme switcher: real, persisted.
- Aster button: opens/closes the Aster companion shell.
- Notes: local per-case notes.
- Continue: returns to active practice flow.
- Teach Me More: only shown when meaningful in context and uses real
  collapsible `TeachingCard`.
- Next Case: calls canonical `loadQuestion`.

Do not add fake dashboard/sidebar/navigation controls.

## 4. Existing Technical Debt

### Content and Metadata Debt

- `ClinicalDecision` stores structured arrays/metadata as JSON strings.
- `tags` multiplexes plain tags, clinical metadata, vignette annotations, and
  RapidRounds case metadata.
- Accepted-answer coverage is still manually authored and incomplete in places.
- Some Teach Me More content depends on deterministic fallback logic.
- Comparison content is strong for known mappings but not comprehensive.
- Decision boundary mappings are explicit and limited.
- Curriculum mappings are partial for future specialties.

### Architecture Debt

- `Question` legacy model still exists and is still used as fallback.
- `ClinicalDecision` is the current primary content model but not the full
  canonical Decision Object architecture envisioned by RFC-018.
- Learner state is event-derived from `Progress`, not a canonical mastery
  object.
- Adaptive decision engine is conservative and not a full scheduler.
- `UserStats` is simple and coexists with richer `Progress` events.
- Auth/profile is absent; anonymous local learner ID is the only identity.
- Subject/shelf filtering is real but content coverage is mostly OB/GYN.

### Presentation Debt

- `PracticePanel.tsx` is large and mixes:
  - app shell
  - theme switching
  - subject selector
  - notes
  - Moleskine adapter
  - default layout
  - Aster shell
- `TutorMode.tsx` is also large and mixes:
  - default repair rendering
  - Moleskine teaching rendering
  - right-panel explanations
  - Teach Me More construction
  - reinforcement form rendering
- Moleskine is currently a dedicated adapter, which was necessary for visual
  direction, but it is not yet a cleanly separated module.
- `app/globals.css` contains many theme-specific selectors and is a risk area.
- Theme primitives are documented but not fully componentized.

### Test Debt

- Many tests inspect source strings because no React DOM/component testing
  framework is installed.
- Source-string tests are useful as architectural guards but can become brittle.
- There is no browser-level E2E suite.
- There is no visual regression harness.
- Presentation-adapter regression coverage now exists but is still mostly
  evaluator/source-invariant based, not true DOM interaction.

### Documentation Debt

- RFC source files are incomplete. RFC-006 through RFC-016 are not checked into
  `rfc/`.
- `docs/ASTER.md` and `docs/ROADMAP.md` are currently empty.
- `rfc/RFC-005 Pertinent Negative Recognition.md` does not match the
  implemented thread-level RFC-005 production-readiness sprint.
- `docs/RFC_IMPLEMENTATION_AUDIT.md` is the best status map but should be
  refreshed after major architecture changes.

## 5. Architectural History

### Major Design Decisions

1. Free-response first
   - RapidRounds is not multiple-choice first. Learners type answers.
   - This forced investment in answer normalization and specificity handling.

2. Deterministic evaluation base
   - AI semantic matching may help, but deterministic accepted-answer matching
     remains the auditable foundation.

3. ClinicalDecision over Question
   - The system shifted from generic questions to clinical decisions with
     metadata.
   - `Question` remains as legacy fallback.

4. Unknown is not wrong
   - Blank/idk/pass/unsure answers produce concept scaffolding.

5. Nearby-correct answers teach boundaries
   - If the answer belongs nearby, explain where it belongs.

6. Cognitive errors are internal
   - They drive adaptation and coaching, but are not default repair-screen
     labels.

7. Shelves are graph filters
   - Curriculum graph is canonical. Shelves are views, not silos.

8. Progress is persistent and learner-scoped
   - Anonymous learner ID scopes durable progress in Postgres.

9. Themes are presentation architecture
   - Modern Academic, Moleskine, Dark Clinical, and Editorial are not just
     color palettes.

10. Moleskine required an adapter
    - Trying to make the default card layout look like a notebook failed.
    - A dedicated presentation adapter became necessary.

### Abandoned or Superseded Approaches

- Dashboard-first home: superseded by zero-friction practice-first flow.
- Universal Try One More: explicitly not reintroduced.
- Generic comparison fallback text: suppressed because it undermined trust.
- Visible cognitive error badges in repair: superseded by concise faculty-style
  feedback.
- Treating Moleskine as a CSS skin only: failed; now a presentation adapter.
- Passive Related Concepts tags: superseded by Continue Learning / Next
  Challenge.

### Lessons Learned

- Presentation adapters are high-risk refactors. They need behavior regression
  tests, not just screenshots or build checks.
- If the UI can mark a correct answer wrong, visual quality is irrelevant.
- Accepted answers are content data, not presentation logic.
- Do not fix answer issues in components.
- Do not let theme work fork engine behavior.
- Tests that assert constitutional behavior are valuable, even when they are
  source-invariant tests.

## 6. Moleskine Notebook

### Why the Original Approach Failed

The original Moleskine implementation tried to apply paper material and
theme-specific CSS to the existing card-based layout. That produced "React
cards on paper" instead of an integrated notebook.

Specific failure:

- Vignette/question rendered in `MoleskineLeftPage`.
- Reasoning chain rendered as `.rr-moleskine-left-reasoning` in a separate
  grid row.
- CSS placed reasoning into `grid-row: 3`.
- Result: huge blank gap between vignette and reasoning.

### Current Adapter Architecture

Warm Notebook path:

- Branches at `if (skin === "warm-notebook")` in `PracticePanel`.
- Uses `MoleskinePracticeLayout`, `MoleskineShell`, `MoleskineSidebar`,
  `MoleskineNotebookSpread`, `MoleskineLeftPage`, `MoleskineRightPage`,
  `MoleskineFooterActions`.
- In learn state, `PracticePanel` passes the vignette/question fragment into
  `TutorMode` via `moleskineLeftPageContent`.
- `TutorMode` renders `MoleskineTeachingDocument`.
- `MoleskineTeachingDocument` renders both:
  - the integrated left page with vignette + reasoning
  - the right page teaching document

### Current Behavior Guarantees

Covered by `tests/presentation-adapter-regression.test.ts`:

- Exact correct ultrasound answer is correct in default and Moleskine.
- Whitespace/case-normalized exact answer is correct.
- Configured aliases are correct.
- Wrong answer remains incorrect.
- Moleskine uses canonical input state and submit path.
- Moleskine components do not own grading logic.
- Solve state is quiet before submission.
- Learn state uses one left-page structure.
- Teach Me More remains collapsed by default.
- No `display: contents` / `grid-row: 3` split for Moleskine left reasoning.

### Remaining Moleskine Issues

- The adapter is still embedded in large `PracticePanel` and `TutorMode` files.
- It should eventually move into separate presentation modules.
- It is not yet visually verified by automated browser screenshots.
- Some CSS is duplicated or layered from prior attempts.
- The notebook material is theme-specific rather than expressed through a
  fully mature primitive system.

### Intended Future Direction

Refactor toward:

```text
components/practice/default/...
components/practice/moleskine/...
components/primitives/...
```

But only after current behavior is stable and regression tests remain intact.

Do not do aesthetic work without behavior gates.

## 7. Engineering Workflow

### Expected Codex Workflow

1. Read relevant docs before changing architecture:
   - `docs/PROJECT_CONSTITUTION.md`
   - `docs/DESIGN_CONSTITUTION.md`
   - `docs/PRODUCT_BLUEPRINT_V1.md`
   - `docs/RAPIDROUNDS_ARCHITECTURE.md`
   - relevant tests
2. Inspect code before editing.
3. Make scoped changes.
4. Add behavior tests for any engine or adapter change.
5. Run checks.
6. Report files changed, test status, and invariant impact.

### Regression Workflow

For engine changes:

- Add deterministic tests in `tests/answer-check.test.ts` or related engine
  test file.
- Cover exact, alias, partial, unknown, wrong, and task-mismatch cases as
  appropriate.
- Do not rely on AI for deterministic tests.

For presentation adapter changes:

- Add tests proving canonical engine state is shared.
- Add visibility/state tests.
- Add CSS/class invariants for known layout regressions.
- Do not rely only on build/typecheck.

For content changes:

- Add accepted answers in seed/content.
- Do not patch evaluator for a single case unless it generalizes.
- Update tests that prove the content convention.

### Release Workflow

Minimum pre-release checks:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

For production data changes:

- Ensure `prisma/seed.ts` does not delete learner progress.
- If schema changes occur, run `pnpm prisma db push` against the intended
  database.
- Current request history strongly prefers avoiding schema changes unless
  unavoidable.

### Testing Expectations

The current test suite uses Node's built-in test runner with `tsx`:

```bash
node --import tsx --test tests/*.test.ts
```

Tests are behavioral contracts. Do not delete or weaken them to pass. If a
presentation change breaks a brittle source test, update the test to assert the
new stable invariant.

Important current tests:

- `tests/answer-check.test.ts`
- `tests/decision-repair.test.ts`
- `tests/educational-assembly.test.ts`
- `tests/persistent-learner-state.test.ts`
- `tests/learner-state.test.ts`
- `tests/adaptive-decision.test.ts`
- `tests/curriculum-graph.test.ts`
- `tests/design-system.test.ts`
- `tests/presentation-adapter-regression.test.ts`

## 8. Repository Invariants

Never break these without an explicit constitutional/RFC-level decision:

1. RapidRounds opens into training, not a dashboard.
2. Each RapidRound tests one primary clinical decision.
3. Answer evaluation is canonical and shared across all themes.
4. Components must not implement grading.
5. Accepted-answer behavior belongs in content/evaluator, not presentation.
6. Unknown responses are not reasoning failures.
7. Partial credit remains distinct from incorrect.
8. Cognitive error labels remain primarily internal.
9. Decision Repair foregrounds correct answer and pivot clue.
10. Teach Me More remains structured and collapsed by default.
11. Decision Boundary Repair appears only for clinically adjacent answers.
12. Generic comparison filler must not be visible.
13. Progress is scoped to anonymous learner ID.
14. No global shared learner progress.
15. Seed must not delete learner progress.
16. Shelves are filtered curriculum graph views.
17. Adaptive recommendations must not interrupt fast practice flow.
18. Moleskine adapter must not fork engine behavior.
19. Theme-specific styles must be scoped.
20. Do not change database schema casually.
21. Do not copy proprietary stems/explanations.
22. Every visible control must do something real.
23. If a correct answer can be marked wrong, release has failed.

## 9. Hidden Assumptions

These are true today but not always obvious:

- `acceptedAnswers` is a JSON string in Prisma, not a native array.
- The first accepted answer is treated as canonical correct answer in
  `app/api/practice/answer/route.ts`.
- `ClinicalDecision` is preferred, but legacy `Question` fallback still exists.
- Most content is OB/GYN; subject selector lists other shelves but disables or
  omits unavailable cases based on real counts.
- Anonymous learner identity is localStorage-based; different browsers/devices
  are different learners.
- There is no auth/profile merge yet.
- `UserStats` is not the full learner model.
- `Progress` is the durable event source for current learner memory.
- Some metadata is encoded in `tags`.
- Vignette annotations are teaching metadata only.
- The Moleskine theme key is `warm-notebook`, not `moleskine`.
- Modern Academic is default.
- Tests often inspect source strings because no DOM test framework exists.
- `docs/ASTER.md` and `docs/ROADMAP.md` are empty at time of writing.
- RFC implementation status depends more on runtime/tests than checked-in RFC
  files for RFC-006 through RFC-016.
- Production requires Postgres/Neon-style `DATABASE_URL`; SQLite is obsolete.
- AI semantic matching may be unavailable depending on environment variables.

## 10. Recommended Reading Order

For a new AI architect, read in this order:

1. `001_ASTER_INITIALIZATION_PROTOCOL.md`
2. `docs/PROJECT_CONSTITUTION.md`
3. `docs/DESIGN_CONSTITUTION.md`
4. `docs/PRODUCT_BLUEPRINT_V1.md`
5. `docs/RAPIDROUNDS_ARCHITECTURE.md`
6. `docs/RFC_IMPLEMENTATION_AUDIT.md`
7. `types/practice.ts`
8. `prisma/schema.prisma`
9. `hooks/usePracticeSession.ts`
10. `app/api/practice/answer/route.ts`
11. `lib/answer-check.ts`
12. `lib/tutor-content.ts`
13. `lib/educational-assembly.ts`
14. `lib/decision-education.ts`
15. `lib/decision-boundary-repair.ts`
16. `lib/clinical-comparison.ts`
17. `lib/reasoning-engine.ts`
18. `lib/cognitive-error.ts`
19. `lib/reasoning-memory.ts`
20. `lib/learner-state.ts`
21. `lib/adaptive-decision.ts`
22. `lib/learning-trajectory.ts`
23. `lib/curriculum-graph.ts`
24. `lib/curriculum-resolution.ts`
25. `lib/clinical-decision-serializers.ts`
26. `lib/rapidrounds-case.ts`
27. `lib/ectopic-pregnancy-variants.ts`
28. `components/PracticePanel.tsx`
29. `components/TutorMode.tsx`
30. `components/TeachingCard.tsx`
31. `app/globals.css`
32. `prisma/seed.ts`
33. `tests/presentation-adapter-regression.test.ts`
34. `tests/answer-check.test.ts`
35. `tests/decision-repair.test.ts`
36. `tests/educational-assembly.test.ts`
37. `tests/adaptive-decision.test.ts`
38. `tests/persistent-learner-state.test.ts`
39. `tests/design-system.test.ts`

## 11. RFC Status

This section uses the current runtime and `docs/RFC_IMPLEMENTATION_AUDIT.md` as
source of truth. The checked-in `rfc/` directory is incomplete.

| RFC | Title / Runtime Theme | Status |
| --- | --- | --- |
| RFC-001 | Universal Answer Intelligence | Implemented |
| RFC-002 | Decision Repair | Mostly implemented |
| RFC-003 | Decision Boundary Repair | Mostly implemented |
| RFC-004 | Unknown State Detection | Implemented |
| RFC-005 | Production Readiness Cleanup | Implemented, but checked-in RFC filename mismatch exists |
| RFC-006 | Teach Me More Content Correction | Mostly implemented |
| RFC-007 | Teach Me More Architecture v2 | Mostly implemented |
| RFC-008 | Cognitive Error Classification Engine | Partially implemented |
| RFC-009 | Cross-Question Knowledge Graph | Mostly implemented |
| RFC-010 | Design System and Visual Language | Mostly implemented |
| RFC-011 | Intelligent Clinical Comparison Engine | Mostly implemented |
| RFC-012 | Expert Illness Script Generator | Mostly implemented |
| RFC-013 | Zero-Friction Training Flow | Mostly implemented |
| RFC-014 | Decision Repair Information Hierarchy | Implemented |
| RFC-015 | Adaptive Learning Trajectory | Partially implemented |
| RFC-016 | Master Curriculum Graph | Mostly implemented |
| RFC-017 | Canonical Learner State Engine | Prototype / first runtime slices |
| RFC-018 | Adaptive Learning Architecture | Prototype / first runtime slices |

Notes:

- RFC-017 is not complete as a canonical learner-state engine. Current state is
  anonymous progress persistence, read-only learner summaries, reasoning memory
  coaching, and conservative use in adaptive selection.
- RFC-018 is not complete as a full adaptive architecture. Current state is a
  conservative adaptive decision service using learner state, curriculum
  relationships, recent misses, weak concepts, and completion avoidance.
- RFC-016 curriculum graph exists and is useful, but coverage remains
  incomplete for all future specialties and overlays.
- RFC-010 design system is active but still evolving. Theme inheritance is the
  rule; component primitives are documented more than fully extracted.

## 12. Future Roadmap: Architecture, Not Features

The long-term architecture should evolve toward these layers:

### 1. Canonical Decision Object Layer

Move from `ClinicalDecision` plus JSON strings toward a durable decision object
model that can express:

- canonical illness script
- variants
- task type
- accepted answers and aliases
- pivot clues
- supporting clues
- distractor clues
- pertinent negatives
- decision boundaries
- comparison targets
- teaching modules
- curriculum node mappings
- shelf overlays
- Aster prompt context

Do not rush schema changes. A code-level metadata layer can continue to bridge
until the schema design is stable.

### 2. Learner State Engine

Move from derived `Progress` summaries to a canonical learner-state service
that can model:

- mastery by concept
- mastery by decision type
- repeated cognitive errors
- confusion pairs
- confidence calibration
- spacing intervals
- readiness by shelf/context
- recommended next actions with explanations

`Progress` should remain the event log. A future learner-state projection can
be cached or materialized if needed.

### 3. Adaptive Decision Engine

Grow `lib/adaptive-decision.ts` into a transparent planner that consumes:

- learner state
- curriculum graph
- decision object metadata
- recent misses
- spaced repetition intervals
- decision boundaries
- Aster coaching priorities

It should return:

- next decision
- action type
- explanation
- alternatives
- confidence
- audit trail

Keep it conservative and explainable.

### 4. Curriculum Graph as Backbone

Continue making shelves filtered graph views. Expand graph coverage across:

- Internal Medicine
- Surgery
- Pediatrics
- Psychiatry
- Family Medicine
- Emergency Medicine
- Neurology
- cross-shelf pregnancy/geriatrics/preventive/emergency overlays

Question selection, Continue Learning, analytics, Aster, and future Observatory
views should all consume the same graph.

### 5. Presentation Primitive System

Extract current theme patterns into explicit primitives:

- Page
- Card
- Panel
- Callout
- Sidebar
- Drawer
- Modal
- Table
- Comparison
- Annotation
- Button
- Input
- Badge
- Flow
- Timeline
- NotebookSection
- MarginNote
- Divider
- Toolbar

Future features should compose primitives. Themes should override primitive
presentation. Avoid per-feature theme patching.

### 6. Aster as Bounded Tutor Layer

Aster should become a tutoring orchestrator that reads:

- current decision
- answer evaluation
- tutor content
- learner state
- curriculum context
- recent reasoning memory

Aster should not invent facts or grade independently. It should ask, challenge,
repair, and reflect only when educational value exceeds interruption cost.

### 7. Observatory as Learner Home

The Observatory is not implemented yet as a full environment. Its future
architecture should consume learner state and curriculum trajectory without
becoming a dashboard or gamified reward layer.

It should visualize:

- direction
- progress
- readiness
- next learning path
- quiet environmental growth

It should not displace the practice-first flow.

## 13. Immediate Priorities for the Next Architect

1. Protect the answer engine.
   - Keep `tests/presentation-adapter-regression.test.ts` green.
   - Add similar adapter regression tests for future presentation changes.

2. Untangle presentation modules.
   - Split Moleskine adapter out of `PracticePanel`/`TutorMode` only after
     tests are stable.

3. Improve content authoring coverage.
   - Add accepted-answer aliases and authored comparisons as content data.

4. Refresh RFC documentation.
   - Check in or reconstruct RFC-006 through RFC-016 if they will remain
     canonical references.

5. Define canonical decision object v1.
   - Do not start with schema unless the object contract is clear.

6. Expand learner-state architecture.
   - Keep event-sourced `Progress`; add projections carefully.

7. Add real component/E2E testing.
   - A DOM or browser-level test layer would reduce reliance on source-string
     assertions for presentation behavior.

## 14. Final Warning

The most dangerous future failure mode is letting presentation work drift into
engine behavior.

RapidRounds can survive an imperfect visual theme. It cannot survive a correct
clinical answer being marked wrong.

When in doubt, protect the engine first.
