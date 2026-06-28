import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { findDecisionBoundaryRepair } from "@/lib/decision-boundary-repair";
import { buildTutorContent } from "@/lib/tutor-content";

const baseDecision = {
  specialty: "Obstetrics",
  system: "Postpartum",
  topic: "Retained placenta",
  prompt: "Postpartum hemorrhage with placenta not delivered after 30 minutes.",
  correctAnswer: "retained placenta",
  acceptedAnswers: JSON.stringify(["retained placenta"]),
  boardPearl: "Failure to deliver the placenta within 30 minutes suggests retained placenta.",
  tags: JSON.stringify(["postpartum hemorrhage", "retained placenta", "30 minutes"]),
  pivotClue: "Placenta undelivered after 30 minutes",
  commonTrap: "uterine atony",
  clinicalPattern: "Postpartum hemorrhage",
  decisionType: "Diagnosis",
  managementPearl: "Manual extraction is indicated when placenta is retained."
};

const gestationalHypertensionDecision = {
  specialty: "Obstetrics",
  system: "Hypertension in Pregnancy",
  topic: "Gestational hypertension",
  prompt: "New hypertension after 20 weeks with no proteinuria or end-organ symptoms.",
  correctAnswer: "gestational hypertension",
  acceptedAnswers: JSON.stringify(["gestational hypertension"]),
  boardPearl: "Hypertension after 20 weeks without proteinuria or severe features is gestational hypertension.",
  tags: JSON.stringify(["gestational hypertension", "20 weeks", "hypertension"]),
  pivotClue: "No proteinuria or end-organ symptoms",
  commonTrap: "preeclampsia",
  clinicalPattern: "Hypertension in pregnancy",
  decisionType: "Diagnosis",
  managementPearl: "Monitor closely because gestational hypertension can progress to preeclampsia."
};

const carboprostContraindicationDecision = {
  specialty: "Obstetrics",
  system: "Postpartum",
  topic: "Carboprost contraindication",
  prompt: "Postpartum hemorrhage in a patient with asthma.",
  correctAnswer: "carboprost",
  acceptedAnswers: JSON.stringify(["carboprost", "hemabate", "prostaglandin f2 alpha"]),
  boardPearl: "Carboprost is contraindicated in asthma.",
  tags: JSON.stringify(["postpartum hemorrhage", "carboprost", "asthma"]),
  pivotClue: "Asthma",
  commonTrap: "methylergonovine",
  clinicalPattern: "Postpartum hemorrhage",
  decisionType: "Contraindication",
  managementPearl: "Avoid carboprost because it can cause bronchospasm."
};

describe("decision repair", () => {
  it("builds a focused TASK_MISMATCH repair", () => {
    const evaluation = evaluateAnswer({
      answer: "Cord prolapse",
      acceptedAnswers: ["emergency cesarean delivery"],
      canonicalAnswer: "emergency cesarean delivery",
      expectedTask: "Management",
      clinicalConcepts: ["Cord prolapse", "palpable cord"]
    });
    const tutor = buildTutorContent(
      {
        ...baseDecision,
        topic: "Cord prolapse",
        correctAnswer: "emergency cesarean delivery",
        acceptedAnswers: JSON.stringify(["emergency cesarean delivery"]),
        pivotClue: "Palpable cord after rupture of membranes",
        decisionType: "Management",
        boardPearl: "Cord prolapse requires immediate delivery."
      },
      "Cord prolapse",
      evaluation
    );

    assert.equal(tutor.repair.style, "TASK_MISMATCH");
    assert.match(tutor.repair.why, /recognized Cord prolapse/i);
    assert.equal(tutor.reinforcement?.question, "What is the immediate next step?");
  });

  it("builds a PARTIAL repair for subtype refinement", () => {
    const evaluation = evaluateAnswer({
      answer: "spontaneous abortion",
      acceptedAnswers: ["inevitable abortion"],
      canonicalAnswer: "inevitable abortion",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(
      {
        ...baseDecision,
        topic: "Inevitable abortion",
        correctAnswer: "inevitable abortion",
        acceptedAnswers: JSON.stringify(["inevitable abortion"]),
        pivotClue: "Open cervical os",
        boardPearl: "Bleeding with an open cervical os is inevitable abortion."
      },
      "spontaneous abortion",
      evaluation
    );

    assert.equal(tutor.repair.style, "PARTIAL");
    assert.match(tutor.repair.why, /identify the subtype/i);
    assert.match(tutor.repair.why, /Open cervical os/i);
  });

  it("compares against the learner answer for incorrect repairs", () => {
    const evaluation = evaluateAnswer({
      answer: "uterine atony",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(baseDecision, "uterine atony", evaluation);

    assert.equal(tutor.repair.style, "INCORRECT");
    assert.match(tutor.repair.why, /uterine atony/i);
    assert.match(tutor.repair.why, /retained placenta/i);
    assert.doesNotMatch(tutor.repair.why, /You answered:/);
  });

  it("does not create generic reinforcement for every miss", () => {
    const evaluation = evaluateAnswer({
      answer: "uterine atony",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(baseDecision, "uterine atony", evaluation);

    assert.equal(tutor.reinforcement, undefined);
  });

  it("adds a decision boundary for magnesium sulfate versus severe-range BP treatment", () => {
    const evaluation = evaluateAnswer({
      answer: "magnesium sulfate",
      acceptedAnswers: ["iv labetalol", "labetalol", "hydralazine", "nifedipine"],
      canonicalAnswer: "iv labetalol",
      expectedTask: "Management"
    });
    const tutor = buildTutorContent(
      {
        ...baseDecision,
        system: "Hypertension in Pregnancy",
        topic: "Severe hypertension treatment",
        correctAnswer: "iv labetalol",
        acceptedAnswers: JSON.stringify(["iv labetalol", "labetalol", "hydralazine", "nifedipine"]),
        prompt: "Pregnancy with persistent BP 170/115.",
        pivotClue: "Persistent severe-range blood pressure",
        boardPearl: "Acute severe hypertension in pregnancy requires prompt antihypertensive therapy.",
        decisionType: "Management",
        managementPearl: "Use IV labetalol, IV hydralazine, or oral nifedipine."
      },
      "magnesium sulfate",
      evaluation
    );

    assert.match(tutor.repair.why, /Your answer becomes correct when magnesium sulfate/i);
    assert.match(tutor.repair.why, /seizure prophylaxis/i);
    assert.match(tutor.repair.why, /maternal stroke risk/i);
  });

  it("adds a hierarchy boundary for placenta increta versus retained placenta", () => {
    const evaluation = evaluateAnswer({
      answer: "placenta increta",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(baseDecision, "placenta increta", evaluation);

    assert.match(tutor.repair.why, /Your answer becomes correct when the vignette proves abnormal placental invasion/i);
    assert.match(tutor.repair.why, /one possible cause/i);
    assert.match(tutor.repair.why, /30 minutes supports retained placenta/i);
  });

  it("adds a sequencing boundary for emergency cesarean versus immediate cord prolapse management", () => {
    const evaluation = evaluateAnswer({
      answer: "emergency cesarean",
      acceptedAnswers: ["elevate presenting part while preparing emergent cesarean"],
      canonicalAnswer: "elevate presenting part while preparing emergent cesarean",
      expectedTask: "Management"
    });
    const tutor = buildTutorContent(
      {
        ...baseDecision,
        topic: "Cord prolapse",
        correctAnswer: "elevate presenting part while preparing emergent cesarean",
        acceptedAnswers: JSON.stringify(["elevate presenting part while preparing emergent cesarean"]),
        prompt: "Sudden fetal bradycardia after rupture of membranes with palpable cord.",
        pivotClue: "Palpable cord after rupture of membranes",
        boardPearl: "Cord prolapse causes sudden fetal bradycardia after membrane rupture.",
        decisionType: "Management",
        managementPearl: "Elevate presenting part and proceed to emergency cesarean."
      },
      "emergency cesarean",
      evaluation
    );

    assert.match(tutor.repair.why, /Your answer becomes correct once cord compression is being relieved/i);
    assert.match(tutor.repair.why, /ultimately required/i);
    assert.match(tutor.repair.why, /immediate maneuver is elevating the presenting part/i);
  });

  it("does not add a decision boundary for unrelated wrong answers", () => {
    const evaluation = evaluateAnswer({
      answer: "uterine atony",
      acceptedAnswers: ["iv labetalol"],
      canonicalAnswer: "iv labetalol",
      expectedTask: "Management"
    });
    const tutor = buildTutorContent(
      {
        ...baseDecision,
        system: "Hypertension in Pregnancy",
        topic: "Severe hypertension treatment",
        correctAnswer: "iv labetalol",
        acceptedAnswers: JSON.stringify(["iv labetalol"]),
        prompt: "Pregnancy with persistent BP 170/115.",
        pivotClue: "Persistent severe-range blood pressure",
        boardPearl: "Acute severe hypertension in pregnancy requires prompt antihypertensive therapy.",
        decisionType: "Management"
      },
      "uterine atony",
      evaluation
    );

    assert.doesNotMatch(tutor.repair.why, /Your answer becomes correct when/i);
  });

  it("builds concept recognition content for UNKNOWN instead of decision repair", () => {
    const evaluation = evaluateAnswer({
      answer: "idk",
      acceptedAnswers: ["iv labetalol", "labetalol", "hydralazine", "nifedipine"],
      canonicalAnswer: "iv labetalol",
      expectedTask: "Management"
    });
    const tutor = buildTutorContent(
      {
        ...baseDecision,
        system: "Hypertension in Pregnancy",
        topic: "Severe hypertension treatment",
        correctAnswer: "iv labetalol",
        acceptedAnswers: JSON.stringify(["iv labetalol", "labetalol", "hydralazine", "nifedipine"]),
        prompt: "Pregnancy with persistent BP 170/115.",
        pivotClue: "Persistent severe-range blood pressure",
        boardPearl: "Acute severe hypertension in pregnancy requires prompt antihypertensive therapy.",
        decisionType: "Management",
        clinicalPattern: "Hypertension in pregnancy",
        tags: JSON.stringify(["severe hypertension", "  Severe hypertension  ", "labetalol", "hydralazine"])
      },
      "idk",
      evaluation
    );

    assert.equal(tutor.repair.style, "UNKNOWN");
    assert.equal(
      tutor.repair.why,
      "Persistent severe-range blood pressure points to iv labetalol as the immediate action."
    );
    assert.deepEqual(tutor.repair.recognitionClues, [
      "Persistent severe-range blood pressure",
      "Hypertension in pregnancy",
      "severe hypertension"
    ]);
    assert.doesNotMatch(tutor.repair.why, /You answered/i);
    assert.doesNotMatch(tutor.repair.why, /discriminator/i);
    assert.doesNotMatch(tutor.repair.why, /Your answer becomes correct when/i);
    assert.equal(tutor.comparison.rows.length > 0, true);
  });

  it("keeps blank primary submissions available from the Practice flow", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const practiceSession = readFileSync("hooks/usePracticeSession.ts", "utf8");

    assert.doesNotMatch(practicePanel, /answer\.trim\(\)\.length === 0/);
    assert.doesNotMatch(practicePanel, /answer\.trim\(\)\.length > 0/);
    assert.doesNotMatch(practiceSession, /answer\.trim\(\)\.length === 0/);
    assert.match(practicePanel, /disabled=\{isSubmitting \|\| mode === "tutor"\}/);
  });

  it("disables browser autofill and spelling assistance on answer inputs", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(practicePanel, /autoComplete="off"/);
    assert.match(practicePanel, /autoCorrect="off"/);
    assert.match(practicePanel, /autoCapitalize="off"/);
    assert.match(practicePanel, /spellCheck=\{false\}/);
    assert.match(tutorMode, /autoComplete: "off"/);
    assert.match(tutorMode, /autoCorrect: "off"/);
    assert.match(tutorMode, /autoCapitalize: "off"/);
    assert.match(tutorMode, /spellCheck: false/);
  });

  it("keeps Teach Me More available and collapsed for UNKNOWN mode", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /tutor\.repair\.style === "UNKNOWN"/);
    assert.match(tutorMode, /<TeachingCard title="Teach me more: illness script and comparison" defaultOpen=\{false\}>/);
    assert.match(tutorMode, /tutor\.comparison\.rows\.map/);
  });

  it("renders every Teach Me More panel with the RFC-007 section framework", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /Illness Script/);
    assert.match(tutorMode, /Expert Recognition/);
    assert.match(tutorMode, /Don't Confuse With/);
    assert.match(tutorMode, /NBME Pivot/);
    assert.match(tutorMode, /Why This Was Tempting/);
  });

  it("builds objective Teach Me More comparison for gestational hypertension vs preeclampsia", () => {
    const evaluation = evaluateAnswer({
      answer: "preeclampsia",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["Gestational hypertension", "preeclampsia"]
    });
    const tutor = buildTutorContent(gestationalHypertensionDecision, "preeclampsia", evaluation);
    const comparisonText = JSON.stringify(tutor.comparison);

    assert.match(tutor.illnessScript.classicPresentation, /Pregnant patient after 20 weeks/);
    assert.match(tutor.illnessScript.classicPresentation, /new-onset hypertension but no proteinuria/);
    assert.match(tutor.illnessScript.classicPresentation, /progression to preeclampsia can occur/);
    assert.equal(
      tutor.recognitionPath,
      ">=20 weeks gestation -> hypertension -> check proteinuria -> absent -> check severe features -> absent -> gestational hypertension"
    );
    assert.equal(tutor.comparison.correctDiagnosis, "Gestational hypertension");
    assert.equal(tutor.comparison.competingDiagnosis, "Preeclampsia");
    assert.doesNotMatch(comparisonText, /Different operation/);
    assert.doesNotMatch(comparisonText, /Missing or misreading that clue/);
    assert.doesNotMatch(comparisonText, /Different next best step/);
    assert.doesNotMatch(comparisonText, /Surface-level overlap/);
    assert.match(comparisonText, /Present, or severe features may establish diagnosis without proteinuria/);
    assert.match(comparisonText, /thrombocytopenia, elevated LFTs, renal dysfunction/);
    assert.match(tutor.nbmePivot ?? "", /proteinuria OR any severe feature/i);
  });

  it("keeps adjacent wrong-answer reasoning separate from the comparison table", () => {
    const evaluation = evaluateAnswer({
      answer: "preeclampsia",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["Gestational hypertension", "preeclampsia"]
    });
    const tutor = buildTutorContent(gestationalHypertensionDecision, "preeclampsia", evaluation);

    assert.match(tutor.repair.why, /Refine it using no proteinuria or end-organ symptoms/i);
    assert.match(tutor.whyTempting ?? "", /jumped to preeclampsia/i);
    assert.doesNotMatch(JSON.stringify(tutor.comparison), /jumped to preeclampsia/i);
  });

  it("only shows Why This Was Tempting for non-UNKNOWN incorrect or partial responses", () => {
    const correctEvaluation = evaluateAnswer({
      answer: "gestational hypertension",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis"
    });
    const partialEvaluation = evaluateAnswer({
      answer: "gestational",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis"
    });
    const unknownEvaluation = evaluateAnswer({
      answer: "idk",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis"
    });

    assert.equal(buildTutorContent(gestationalHypertensionDecision, "gestational hypertension", correctEvaluation).whyTempting, undefined);
    assert.match(buildTutorContent(gestationalHypertensionDecision, "gestational", partialEvaluation).whyTempting ?? "", /separating clue/i);
    assert.equal(buildTutorContent(gestationalHypertensionDecision, "idk", unknownEvaluation).whyTempting, undefined);
  });

  it("builds the standardized Teach Me More content for carboprost contraindication", () => {
    const evaluation = evaluateAnswer({
      answer: "methylergonovine",
      acceptedAnswers: ["carboprost", "hemabate", "prostaglandin f2 alpha"],
      canonicalAnswer: "carboprost",
      expectedTask: "Contraindication",
      clinicalConcepts: ["carboprost", "methylergonovine"]
    });
    const tutor = buildTutorContent(carboprostContraindicationDecision, "methylergonovine", evaluation);
    const comparisonText = JSON.stringify(tutor.comparison);

    assert.match(tutor.illnessScript.classicPresentation, /asthma changes the medication choice/i);
    assert.match(tutor.illnessScript.classicPresentation, /bronchospasm risk becomes the retrieval cue/i);
    assert.match(tutor.recognitionPath ?? "", /asthma present -> avoid carboprost/i);
    assert.match(tutor.nbmePivot ?? "", /Asthma immediately excludes carboprost/i);
    assert.match(tutor.whyTempting ?? "", /uterotonics feel interchangeable/i);
    assert.equal(tutor.comparison.correctDiagnosis, "Carboprost contraindication");
    assert.equal(tutor.comparison.competingDiagnosis, "Methylergonovine contraindication");
    assert.match(comparisonText, /Asthma excludes carboprost/);
    assert.match(comparisonText, /Hypertension excludes methylergonovine/);
  });

  it("classifies Missed Pivot Clue when the answer recognizes the broad pattern but misses the discriminator", () => {
    const evaluation = evaluateAnswer({
      answer: "postpartum hemorrhage",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["Postpartum hemorrhage", "retained placenta"]
    });
    const tutor = buildTutorContent(baseDecision, "postpartum hemorrhage", evaluation);

    assert.equal(evaluation.classification, "PARTIAL");
    assert.equal(tutor.cognitiveError?.type, "Missed Pivot Clue");
    assert.equal(tutor.repair.cognitiveError?.type, "Missed Pivot Clue");
    assert.match(tutor.cognitiveError?.missedClue ?? "", /Placenta undelivered after 30 minutes/i);
  });

  it("classifies Premature Closure for jumping from hypertension after 20 weeks to preeclampsia", () => {
    const evaluation = evaluateAnswer({
      answer: "preeclampsia",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["Gestational hypertension", "preeclampsia"]
    });
    const tutor = buildTutorContent(gestationalHypertensionDecision, "preeclampsia", evaluation);

    assert.equal(tutor.cognitiveError?.type, "Premature Closure");
    assert.match(tutor.cognitiveError?.whyAttractive ?? "", /first pattern looked familiar/i);
    assert.match(tutor.cognitiveError?.expertCorrection ?? "", /confirm the required finding/i);
  });

  it("classifies Contraindication Error for choosing the neighboring uterotonic", () => {
    const evaluation = evaluateAnswer({
      answer: "methylergonovine",
      acceptedAnswers: ["carboprost", "hemabate", "prostaglandin f2 alpha"],
      canonicalAnswer: "carboprost",
      expectedTask: "Contraindication",
      clinicalConcepts: ["carboprost", "methylergonovine"]
    });
    const tutor = buildTutorContent(carboprostContraindicationDecision, "methylergonovine", evaluation);

    assert.equal(tutor.cognitiveError?.type, "Contraindication Error");
    assert.match(tutor.cognitiveError?.missedClue ?? "", /Asthma/i);
    assert.match(tutor.cognitiveError?.expertCorrection ?? "", /screen contraindications/i);
  });

  it("does not assign a cognitive error to correct answers or change grading", () => {
    const evaluation = evaluateAnswer({
      answer: "gestational hypertension",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis"
    });
    const tutor = buildTutorContent(gestationalHypertensionDecision, "gestational hypertension", evaluation);

    assert.equal(evaluation.isCorrect, true);
    assert.equal(evaluation.classification, "EXACT");
    assert.equal(tutor.cognitiveError, undefined);
    assert.equal(tutor.repair.cognitiveError, undefined);
  });

  it("keeps cognitive error classification internal to analytics instead of the repair screen", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.doesNotMatch(tutorMode, /Your reasoning pattern/);
    assert.doesNotMatch(tutorMode, /Cognitive Error:/);
    assert.doesNotMatch(tutorMode, /tutor\.repair\.cognitiveError/);
    assert.match(tutorMode, /Expert Correction/);
  });
});

describe("decision boundary helper", () => {
  it("returns mapped explanations only for nearby clinically meaningful answers", () => {
    assert.match(
      findDecisionBoundaryRepair({
        learnerAnswer: "magnesium",
        correctAnswer: "labetalol",
        acceptedAnswers: ["iv labetalol"]
      }) ?? "",
      /seizure prophylaxis/i
    );
    assert.equal(
      findDecisionBoundaryRepair({
        learnerAnswer: "uterine atony",
        correctAnswer: "iv labetalol",
        acceptedAnswers: ["iv labetalol"]
      }),
      undefined
    );
  });
});
