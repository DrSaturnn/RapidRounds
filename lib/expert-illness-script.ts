import { normalizeAnswer } from "@/lib/answer-check";

type IllnessScriptDecision = {
  specialty: string;
  topic?: string;
  diagnosis?: string;
  correctAnswer: string;
  clinicalPattern?: string;
  pattern?: string;
  pivotClue?: string;
  managementPearl?: string;
  management?: string;
  boardPearl: string;
};

const specialtyPatientFrame: Record<string, string> = {
  Obstetrics: "Pregnant or postpartum patient",
  "Internal Medicine": "Adult patient",
  Pediatrics: "Infant or child",
  Surgery: "Patient with an acute surgical pattern",
  Psychiatry: "Patient with symptoms organized by duration and impairment"
};

const expertScripts: Record<string, string> = {
  "gestational hypertension":
    "Pregnant patient after 20 weeks with new-onset hypertension but no proteinuria, severe symptoms, or end-organ injury. Maternal and fetal status are usually stable, but this sits on the hypertensive-disorder spectrum. Monitor blood pressure and fetal well-being closely because progression to preeclampsia can occur.",
  "preeclampsia without severe feature":
    "Pregnant patient after 20 weeks with new-onset hypertension and proteinuria but no severe features. Maternal and fetal status are usually stable, yet the disease can progress. Monitor closely, watch for severe-range pressures or end-organ symptoms, and deliver at 37 weeks if the patient remains stable.",
  "preeclampsia with severe feature":
    "Pregnant patient after 20 weeks with hypertension plus severe-range pressure, neurologic symptoms, RUQ pain, thrombocytopenia, renal dysfunction, pulmonary edema, or elevated LFTs. This is maternal end-organ risk, not just elevated blood pressure. Stabilize, give magnesium sulfate for seizure prophylaxis, control severe pressures, and plan delivery based on stability and gestational age.",
  "carboprost contraindication":
    "Postpartum hemorrhage patient who needs uterine tone restored, but asthma changes the medication choice. Carboprost is a prostaglandin F2-alpha uterotonic, so bronchospasm risk becomes the retrieval cue. Choose another uterotonic rather than treating all postpartum hemorrhage medications as interchangeable.",
  "placental abruption":
    "Third-trimester bleeding with abdominal pain, contractions, and a tender or rigid uterus brings placental abruption to mind. The placenta is separating, so maternal hemorrhage and fetal distress drive urgency. Stabilize the mother first, then deliver if maternal or fetal instability is present.",
  "placenta previa":
    "Third-trimester painless bright red bleeding with a soft, nontender uterus brings placenta previa to mind. The placenta may cover the cervical os, so the immediate implication is procedural safety. Localize the placenta with ultrasound and avoid digital cervical examination until previa is excluded.",
  "category i fetal tracing":
    "Labor tracing with baseline 110-160, moderate variability, and no recurrent concerning decelerations is a reassuring fetal pattern. Moderate variability is the mental anchor because it reflects intact fetal oxygenation. Continue routine monitoring instead of escalating to intrauterine resuscitation.",
  "vulvovaginal candidiasis":
    "Patient with vulvar pruritus, irritation, and thick white discharge brings candidiasis to mind. The retrieval cue is yeast on microscopy, especially pseudohyphae or budding yeast. Treat with a topical azole or oral fluconazole if not pregnant.",
  "bacterial vaginosis":
    "Patient with thin gray discharge and fishy odor brings bacterial vaginosis to mind. Clue cells and a positive whiff test point to a vaginal flora shift rather than inflammation from yeast. Treat symptomatic disease with metronidazole."
};

function sentence(value?: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function getDiagnosis(decision: IllnessScriptDecision) {
  return decision.topic ?? decision.diagnosis ?? decision.correctAnswer;
}

function getPattern(decision: IllnessScriptDecision) {
  return sentence(decision.clinicalPattern ?? decision.pattern);
}

function getManagement(decision: IllnessScriptDecision) {
  return sentence(decision.managementPearl ?? decision.management);
}

function getPivot(decision: IllnessScriptDecision) {
  return sentence(decision.pivotClue);
}

export function buildExpertIllnessScript(decision: IllnessScriptDecision) {
  const diagnosis = sentence(getDiagnosis(decision));
  const mapped = expertScripts[normalizeAnswer(diagnosis)];

  if (mapped) {
    return mapped;
  }

  const patient = specialtyPatientFrame[decision.specialty] ?? "Patient";
  const pattern = getPattern(decision);
  const pivot = getPivot(decision);
  const management = getManagement(decision);
  const boardPearl = sentence(decision.boardPearl);
  const presentation = pattern && pivot && pattern.toLowerCase() !== pivot.toLowerCase()
    ? `${pattern.toLowerCase()} and ${pivot.toLowerCase()}`
    : (pivot || pattern || boardPearl).toLowerCase();
  const implication = boardPearl || `${diagnosis} should come to mind from this pattern`;
  const managementPearl = management ? ` ${management}.` : "";

  return `${patient} with ${presentation} should make ${diagnosis} come to mind quickly. ${implication}.${managementPearl} Use the pivot clue to retrieve the diagnosis under exam pressure, then choose the next step that matches stability and timing.`;
}
