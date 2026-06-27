# RapidRounds Design System

RapidRounds is a clinical recall environment, not a study app. The interface should feel like a calm attending asking one sharp question at a time, with a whiteboard appearing only when the learner needs teaching.

## Product Philosophy

The product creates a narrow channel: read, retrieve, decide, move. The default state is quiet. Teaching appears only after an incorrect answer or an explicit request.

RapidRounds optimizes for reviewing 100-200 clinical decisions in a session. Every visual choice should reduce friction during retrieval.

## Design Principles

1. Retrieval first: prompt and answer field dominate Practice.
2. One decision at a time: no competing panels during Rapid Review.
3. Teach only when needed: explanation is contextual, not permanent.
4. Context is not decoration: specialty, system, topic, and decision type appear only when useful.
5. Speed is visual: short lines, clear actions, no ornamental density.
6. Calm is not empty: use proportion, rhythm, and material restraint.
7. Tutor Mode is a whiteboard: structured, human, erasable, never textbook-like.
8. Analytics diagnose the learner: focus on reasoning processes, not trivia misses.

## Information Hierarchy

Practice:
1. Prompt
2. Answer input
3. Submit / Teach Me
4. Immediate result
5. Board Pearl
6. Next

Tutor Mode:
1. Clinical Reasoning Analysis
2. Primary Error
3. Pivot Clue
4. Smallest corrective teaching unit
5. Comparison
6. Reinforcement

Dashboard:
1. Resume Practice
2. Today's session state
3. One weakest focus area
4. Optional deeper analytics

Analytics:
1. Primary reasoning errors
2. Weak decision types
3. Weak topics/systems
4. Missed diagnoses or traps

## Spacing

RapidRounds uses an 8px base system.

- `4px`: tight internal relationships
- `8px`: inline element spacing
- `16px`: standard component spacing
- `24px`: section grouping
- `32px`: major vertical rhythm
- `48px`: page-level spacing
- `64px`: large top-level separation

Recommended max widths:

- Practice prompt: `720px`
- Tutor Mode: `820px`
- Dashboard: `960px`
- Analytics: `1040px`

## Typography

Use system sans-serif for speed, neutrality, and durability.

Scale:

- Page title: `32-40px`
- Practice prompt: `24-28px`
- Tutor card heading: `15-16px`
- Body: `15-16px`
- Metadata: `12-13px`
- Session counters: `12px`

Rules:

- No negative letter spacing
- No viewport-scaled type
- Keep practice prompt line length controlled
- Use weight before color for hierarchy
- Avoid all-caps except tiny metadata labels

## Color

Core tokens:

- Background: `#FFFFFF`
- Foreground: `#0A0A0A`
- Muted: `#6B6B6B`
- Line: `#111111`
- Soft line: `#D8D8D8`
- Surface: `#FAFAF8`
- Success: `#137A3A`
- Error: `#B42318`
- Focus: `#000000`

Color communicates state or mode. It is never decoration.

## Motion

Motion should be nearly invisible.

Use motion for:

- Entering Tutor Mode
- Expanding teaching cards
- Moving to next prompt
- Revealing feedback

Timing:

- `100-150ms`: input/action feedback
- `180-240ms`: Tutor Mode reveal

All motion must respect reduced-motion preferences.

## Material

RapidRounds does not use glossy glassmorphism. The material language is paper, whiteboard, thin ink lines, light neutral surfaces, and crisp boundaries.

Rapid Review uses pure white and minimal borders. Tutor Mode uses a slight surface shift and collapsible whiteboard cards. Dashboard and Analytics use structured rows and bands instead of decorative card grids.

## Component Library

- `AppShell`: page layout and navigation visibility
- `TopNav`: visible outside Focus Mode, hidden or collapsed during Practice
- `MetricRow`: restrained dashboard and analytics metrics
- `PrimaryAction`: Resume, Submit, Next
- `SecondaryAction`: Teach Me, filters, non-primary commands
- `PracticePrompt`: central retrieval unit
- `DecisionContext`: compact decision metadata
- `AnswerInput`: single-line by default
- `RapidFeedback`: correct/incorrect state with one-sentence Board Pearl
- `TutorWhiteboard`: Tutor Mode container
- `TeachingCard`: collapsible teaching unit
- `ComparisonTable`: compact comparison table
- `ReinforcementPrompt`: final Tutor Mode checkpoint
- `AnalyticsList`: ranked reasoning weaknesses
- `EmptyState`: quiet, instructional empty state

## Navigation

Navigation is present when choosing what to do and absent when doing it.

Practice should enter Focus Mode. Global navigation disappears or collapses, and only essential session context remains.

## Focus Mode

Focus Mode is the signature interaction. The screen narrows, metadata becomes compact, prompt and answer dominate, and the interface becomes almost silent.

Future additions may include a session timer, 100-decision session target, keyboard-first flow, minimal command palette, and end-session summary.

## Companion Voice

RapidRounds sounds like a clinical coach, not a chatbot.

Voice rules:

- Direct
- Brief
- Clinically precise
- Never over-explaining
- Never childish
- Calm when wrong
- Efficient when correct

Correct response tone: "Correct." Then Board Pearl.

Incorrect response tone: "Primary error: Missed Pivot Clue." Then the smallest useful intervention.

## Accessibility

- Full keyboard navigation for Practice
- Visible focus rings
- Do not rely on color alone
- Maintain strong contrast
- Inputs must have labels
- Collapsible cards use semantic controls
- Tables need readable headers
- Motion respects reduced-motion preferences
- Touch targets are at least `44px`
- Tutor Mode cannot require hover

## Responsive Strategy

Mobile:

- Practice remains single-column
- Input and buttons stack
- Tutor cards are full-width
- Comparison tables scroll horizontally

Tablet:

- Practice remains centered
- Tutor Mode can widen
- Analytics lists remain stacked

Desktop:

- Practice uses a narrow central column
- Tutor Mode can expand slightly wider
- Analytics uses columns only when comparison benefits

## Staged Implementation

1. Design tokens
2. App Shell and Focus Mode
3. Practice refinement
4. Tutor material system
5. Dashboard hierarchy
6. Analytics reframing
7. Motion and accessibility pass
8. Documentation updates
