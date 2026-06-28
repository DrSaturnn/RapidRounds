import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateAnswer } from "@/lib/answer-check";
import { buildTutorContent } from "@/lib/tutor-content";

const gsmDecision = {
  specialty: "Obstetrics",
  system: "Menopause and Urogynecology",
  topic: "Genitourinary syndrome of menopause",
  prompt: "Postmenopausal vaginal dryness, dyspareunia, and recurrent irritation.",
  correctAnswer: "genitourinary syndrome of menopause",
  acceptedAnswers: JSON.stringify(["genitourinary syndrome of menopause", "vaginal atrophy", "atrophic vaginitis"]),
  boardPearl: "Hypoestrogenism causes vaginal atrophy and urinary symptoms after menopause.",
  tags: JSON.stringify(["menopause", "vaginal atrophy", "dyspareunia"]),
  pivotClue: "Postmenopausal vaginal dryness",
  commonTrap: "vulvovaginal candidiasis",
  clinicalPattern: "Postmenopausal dryness and dyspareunia",
  decisionType: "Diagnosis",
  managementPearl: "Use vaginal estrogen for persistent symptoms without contraindications."
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

const genericDecision = {
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

describe("illness script teaching blocks", () => {
  it("adds meaningful Typical Patient metadata when available", () => {
    const tutor = buildTutorContent(gsmDecision, "vulvar atrophy", evaluateAnswer({
      answer: "vulvar atrophy",
      acceptedAnswers: ["genitourinary syndrome of menopause", "vaginal atrophy", "atrophic vaginitis"],
      canonicalAnswer: "genitourinary syndrome of menopause",
      expectedTask: "Diagnosis"
    }));

    assert.deepEqual(tutor.illnessScript.typicalPatientFindings, [
      "postmenopausal patient",
      "vaginal dryness",
      "dyspareunia",
      "urinary irritation"
    ]);
  });

  it("renders Recognition Goal as a contrastive learning objective", () => {
    const tutor = buildTutorContent(gestationalHypertensionDecision, "preeclampsia", evaluateAnswer({
      answer: "preeclampsia",
      acceptedAnswers: ["gestational hypertension"],
      canonicalAnswer: "gestational hypertension",
      expectedTask: "Diagnosis",
      clinicalConcepts: ["preeclampsia"]
    }));

    assert.equal(tutor.illnessScript.recognitionGoal, "Distinguish from preeclampsia.");
    assert.notEqual(tutor.illnessScript.recognitionGoal, tutor.repair.clueMeaning);
  });

  it("adds key negatives only when available", () => {
    const gsmTutor = buildTutorContent(gsmDecision, "genitourinary syndrome of menopause", evaluateAnswer({
      answer: "genitourinary syndrome of menopause",
      acceptedAnswers: ["genitourinary syndrome of menopause"],
      canonicalAnswer: "genitourinary syndrome of menopause",
      expectedTask: "Diagnosis"
    }));
    const genericTutor = buildTutorContent(genericDecision, "uterine atony", evaluateAnswer({
      answer: "uterine atony",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    }));

    assert.deepEqual(gsmTutor.illnessScript.keyNegativeFindings, ["no thick discharge", "no vulvar plaques", "no focal lesion"]);
    assert.equal(genericTutor.illnessScript.keyNegativeFindings, undefined);
  });

  it("omits structured fields when content is missing", () => {
    const tutor = buildTutorContent(genericDecision, "retained placenta", evaluateAnswer({
      answer: "retained placenta",
      acceptedAnswers: ["retained placenta"],
      canonicalAnswer: "retained placenta",
      expectedTask: "Diagnosis"
    }));

    assert.equal(tutor.illnessScript.typicalPatientFindings, undefined);
    assert.equal(tutor.illnessScript.recognitionGoal, undefined);
    assert.equal(tutor.illnessScript.keyNegativeFindings, undefined);
  });

  it("renders structured blocks and does not render the generic typical-patient fallback", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");

    assert.match(tutorMode, /<TeachingList title="Typical patient"/);
    assert.match(tutorMode, /<TeachingFact label="Recognition goal" value=\{tutor\.illnessScript\.recognitionGoal\}/);
    assert.match(tutorMode, /<TeachingList title="Key negatives"/);
    assert.match(tutorMode, /shouldShowIllnessScriptProse/);
    assert.doesNotMatch(tutorMode, /tutor\.illnessScript\.typicalPatient\}/);
    assert.doesNotMatch(tutorMode, /Patient matching the clinical pattern/);
  });
});
