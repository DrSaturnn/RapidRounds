import { normalizeAnswer } from "@/lib/answer-check";

type DecisionBoundaryInput = {
  learnerAnswer: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
};

type DecisionBoundaryRule = {
  learnerAnswers: string[];
  correctAnswers: string[];
  explanation: string;
};

const decisionBoundaryRules: DecisionBoundaryRule[] = [
  {
    learnerAnswers: ["magnesium sulfate", "magnesium"],
    correctAnswers: ["iv labetalol", "labetalol", "iv hydralazine", "hydralazine", "oral nifedipine", "nifedipine"],
    explanation:
      "Your answer becomes correct when magnesium sulfate is being used for seizure prophylaxis in severe preeclampsia or to treat eclampsia. Here, persistent severe-range BP creates maternal stroke risk, so the immediate decision is BP control with IV labetalol, IV hydralazine, or oral nifedipine. Many patients may need both."
  },
  {
    learnerAnswers: ["placenta increta", "increta", "placenta accreta spectrum", "placenta accreta"],
    correctAnswers: ["retained placenta"],
    explanation:
      "Your answer becomes correct when the vignette proves abnormal placental invasion. Here, failure to deliver the placenta after 30 minutes supports retained placenta; placenta increta is one possible cause, but the stem has not proven invasion."
  },
  {
    learnerAnswers: ["emergency cesarean", "emergent cesarean", "emergency cesarean delivery", "cesarean delivery", "c section", "c-section"],
    correctAnswers: [
      "elevate presenting part",
      "elevate the presenting part",
      "manual elevation of presenting part",
      "elevate presenting part while preparing emergent cesarean",
      "elevate the presenting part while preparing emergent cesarean"
    ],
    explanation:
      "Your answer becomes correct once cord compression is being relieved and delivery is underway. Emergency cesarean is ultimately required, but the immediate maneuver is elevating the presenting part while preparing for emergent cesarean."
  }
];

function matchesAny(value: string, candidates: string[]) {
  const normalizedValue = normalizeAnswer(value);

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeAnswer(candidate);
    return (
      normalizedValue === normalizedCandidate ||
      normalizedValue.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedValue)
    );
  });
}

export function findDecisionBoundaryRepair({
  learnerAnswer,
  correctAnswer,
  acceptedAnswers = []
}: DecisionBoundaryInput) {
  const correctOptions = [correctAnswer, ...acceptedAnswers].filter(Boolean);

  return decisionBoundaryRules.find(
    (rule) => matchesAny(learnerAnswer, rule.learnerAnswers) && correctOptions.some((answer) => matchesAny(answer, rule.correctAnswers))
  )?.explanation;
}
