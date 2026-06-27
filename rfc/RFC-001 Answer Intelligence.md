# RFC-001 Universal Answer Intelligence

RapidRounds evaluates learner responses through `evaluateAnswer` in `lib/answer-check.ts`.
That function is the shared gateway for answer interpretation and returns a structured
`AnswerEvaluation` object while preserving the legacy `compareAnswer` boolean wrapper.

## Pipeline

1. Normalize whitespace, capitalization, punctuation, hyphens, and simple plural forms.
2. Compare against the canonical answer and configured accepted-answer aliases.
3. Apply conservative spelling correction only when one safe target exists.
4. Recognize the intended clinical concept from specialty-agnostic concept strings.
5. Recognize the task family from the expected decision type or task words in the answer.
6. Classify the result as `EXACT`, `EQUIVALENT`, `SPELLING_VARIATION`, `TASK_MISMATCH`,
   `PARTIAL`, `INCORRECT`, or `AMBIGUOUS`.

## Data Model

No schema migration is required for RFC-001. Existing `acceptedAnswers` arrays are treated
as alias lists for the expected clinical concept. `ClinicalDecision.decisionType` supplies
the expected task, and existing clinical metadata such as `topic`, `clinicalPattern`,
`commonTrap`, and `tags` provide concept-recognition hints.

Future RFCs can add first-class concept and alias tables without changing the evaluation
contract consumed by the API or UI.

## API Compatibility

`POST /api/practice/answer` still returns top-level `isCorrect` and `correctAnswer`.
The richer evaluation is exposed as `evaluation`, allowing current UI flows to continue
working while Tutor Mode and analytics can gradually consume more detail.
