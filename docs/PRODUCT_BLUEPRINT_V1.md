# RapidRounds Product Blueprint v1

This document is the canonical product experience bridge between the
architecture and the user interface. It is not an RFC and does not define
runtime behavior.

The Constitution defines durable product laws. The architecture documents define
system responsibilities. This Blueprint defines what using RapidRounds should
feel like.

## 1. Product Philosophy

RapidRounds should feel like entering a calm clinical reasoning environment
where the next useful decision is already waiting.

The emotional arc should be:

- before a session: oriented, unblocked, and ready to think
- during a session: focused, challenged, and supported without interruption
- after a session: clearer, steadier, and aware of what improved

RapidRounds should differ from traditional question banks by centering the act
of reasoning rather than the accumulation of completed questions. The learner
should not feel like they are sorting through content. They should feel like the
system is selecting the next meaningful clinical decision and helping them
repair the exact boundary that matters.

The product should make thinking feel active and worthwhile. Correct answers
should feel clean and earned. Mistakes should feel repairable, specific, and
useful. Unknown answers should feel like a normal starting point for building a
concept, not like a failure.

RapidRounds should create confidence through clarity, not through hype.

## 2. Product Identity

RapidRounds has three durable product identities:

- RapidRounds
- Aster
- The Observatory

### RapidRounds

RapidRounds is the training engine. It presents one clinical decision at a time,
evaluates the learner's answer, repairs errors when needed, and recommends the
next highest-value learning action.

RapidRounds should feel direct, precise, and momentum-preserving. It should not
feel like a dashboard, content library, or generic flashcard deck.

### Aster

Aster is the tutoring presence. Aster should feel like a thoughtful clinical
coach who appears only when the learner would benefit from dialogue, challenge,
or reflection.

Aster is not the product's default surface. Aster should not crowd the training
flow or replace the learner's reasoning.

### The Observatory

The Observatory is the learner's home.

It is the persistent environment the learner returns to between study sessions.
It should quietly represent the learner's progress, direction, and readiness
without becoming a game board, reward loop, or decorative illustration.

The Observatory is not decorative artwork. It is a product environment. It
should help the learner feel that their clinical reasoning is being organized
over time.

Future evolution may include:

- changing light
- seasonal atmosphere
- subtle environmental growth
- increased warmth
- improved organization
- clearer learning pathways

These changes should remain calm and meaningful. The Observatory should avoid
flashy animations, badges-for-everything, streak pressure, celebration spam, or
reward systems that distract from mastery.

## 3. Aster

Aster is not a chatbot.

Aster is an adaptive tutoring presence that appears only when educational value
exceeds interruption cost.

Aster should:

- ask questions
- guide reasoning
- challenge assumptions
- repair misconceptions
- encourage reflection
- help the learner name the decision boundary
- connect the current mistake to the next useful concept

Aster should avoid:

- excessive talking
- unnecessary praise
- generic motivation
- replacing learner reasoning
- explaining before the learner has tried to think
- appearing constantly
- becoming the center of the interface

Aster's voice should be calm, concise, and clinically precise. Aster should
sound like a coach who respects the learner's effort and time.

## 4. The Core Session

The ideal RapidRounds session is a continuous learning loop:

```text
Return to Observatory
  -> Continue Learning
  -> RapidRound
  -> Answer
  -> Decision Repair, if needed
  -> Teach Me More, optional
  -> Next recommendation
  -> Return to Observatory
```

The learner should remain in flow throughout. Each step should make the next
step obvious.

The session should preserve a simple rhythm:

1. See the clinical decision.
2. Commit to an answer.
3. Receive the smallest useful feedback.
4. Expand only if deeper teaching is wanted or needed.
5. Move to the next adaptive action.

RapidRounds should not ask the learner to manage the system while studying. The
system should carry the learning path quietly in the background.

## 5. UI Philosophy

Every screen should protect clinical reasoning.

UI principles:

- calm
- distraction-free
- progressive disclosure
- minimal cognitive load
- reasoning before explanation
- one primary action
- consistent interaction patterns
- compact feedback
- visible direction
- no unnecessary choice

The interface should favor clarity over novelty. It should use visual hierarchy,
spacing, and restraint before adding color, motion, or ornament.

The learner should always know:

- what decision they are making
- what action is primary
- why a recommendation appeared
- what changed after a mistake
- where to go next

Progressive disclosure is a core interaction principle. The default view should
show only what is needed now. Deeper teaching, analytics, and reflection should
be available without crowding the primary decision.

## 6. Product Principles

Thinking should feel rewarding.

The product should reward the act of reasoning, not only the outcome. The
learner should feel that committing to an answer produces useful feedback.

Mistakes are opportunities.

A missed decision should immediately become a clearer boundary, a better
heuristic, or a stronger illness script.

Progress should feel earned.

Progress should emerge from repeated retrieval, repaired misconceptions,
improved confidence calibration, and durable concept mastery. It should not rely
on inflated praise or artificial rewards.

Mastery should be visible but subtle.

The learner should sense that the system understands their trajectory without
being overwhelmed by metrics. Mastery signals should be quiet, interpretable,
and connected to action.

The interface should disappear behind the educational experience.

RapidRounds should feel less like operating software and more like entering a
well-run training session.

## 7. Future Vision

Future versions may deepen the product experience without changing the core
identity.

Possible directions include:

- richer Observatory
- richer learner trajectory visualization
- simulations
- oral boards-style reasoning practice
- AI coaching through Aster
- collaborative learning
- educator mode
- longitudinal readiness planning
- mobile and offline study environments

These future experiences should consume the existing architecture rather than
redefine it. They should render learner state, adaptive decisions, curriculum
relationships, and educational evidence in ways that help the learner think
more clearly.

Future product work should preserve the v1 identity:

- RapidRounds is the training engine.
- Aster is the tutoring presence.
- The Observatory is the learner's home.
- The learner's reasoning remains the center of the product.

## Relationship to Other Documents

- [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md) defines durable product
  laws and non-negotiable constraints.
- [RAPIDROUNDS_ARCHITECTURE.md](RAPIDROUNDS_ARCHITECTURE.md) describes the
  current system architecture.
- [../rfc/](../rfc/) contains feature and architecture proposals.
- This Blueprint defines the intended product experience for v1 UI work.
