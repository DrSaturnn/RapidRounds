# RapidRounds Cognitive Workflow v1.0

RapidRounds is designed around one complete clinical reasoning loop.

The interface and engine must support this sequence:

1. Encounter the case
2. Generate a diagnosis or next step
3. Commit to an answer
4. Receive expert reasoning
5. Identify the pivot clue
6. Repair the decision boundary if needed
7. Learn one durable principle
8. Optionally go deeper
9. Move to the next adaptive case

## Stage 1: Encounter

The learner sees one vignette or clinical prompt.

The interface should be quiet.

No explanations.
No annotations.
No answer hints.

## Stage 2: Commit

The learner enters an answer or selects an option.

Commitment is required before teaching appears.

## Stage 3: Evaluate

The engine evaluates the response using:

- semantic answer matching
- accepted answer aliases
- partial-credit recognition
- decision repair
- decision boundary detection

The learner should not see raw internal labels.

## Stage 4: Explain

The UI explains why the correct answer is correct.

This should be concise.

The first explanation should answer:

"What was the expert move?"

## Stage 5: Annotate

The vignette is annotated only after answer submission.

Annotations may include:

- context clues
- supporting clues
- pivot clues
- distractor clues
- neutral findings

Annotations should be sparse.

Only mark what changes reasoning.

## Stage 6: Boundary Repair

If the learner confused two nearby diagnoses or management options, show Decision Boundary Repair.

Decision Boundary should compare:

- correct answer
- learner answer, if clinically mapped
- most common confusion, if learner answer cannot be mapped

Decision Boundary should not appear for unrelated wrong answers.

## Stage 7: Reasoning Diagnosis

Explain the type of reasoning failure in learner-facing language.

Examples:

- "You recognized the broad problem, but missed the discriminator."
- "You knew the diagnosis, but chose the wrong next step."
- "You overweighted a distractor clue."
- "You missed the management threshold."

Do not show raw engine labels.

## Stage 8: Clinical Pearl

Give one durable takeaway.

The pearl should be short enough to remember.

## Stage 9: Teach Me More

Teach Me More is collapsed by default.

It expands only when requested.

It may include:

- deeper pathophysiology
- management algorithm
- differential comparison
- board-style trap
- memory anchor

Do not force depth on every learner.

## Stage 10: Adaptive Next Case

The adaptive engine selects the next case.

The learner should not manually choose variant, difficulty, repair type, or script unless explicitly in a browse mode.

Next Case should appear only after submission.

## Workflow Rules

The learner should experience:

Question
-> answer
-> explanation
-> comparison if needed
-> pearl
-> optional depth
-> next case

Never:

Question
-> dashboard
-> analytics
-> settings
-> unrelated navigation

## UI Consequences

Before submission, hide:

- explanations
- Build the Pattern
- Teach Me More
- Decision Boundary
- Reasoning Diagnosis
- Next Case

After submission, reveal progressively.
