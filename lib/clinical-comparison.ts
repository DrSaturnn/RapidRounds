import { normalizeAnswer } from "@/lib/answer-check";
import type { TutorContent } from "@/types/practice";

type ComparisonDecision = {
  topic?: string;
  diagnosis?: string;
  correctAnswer: string;
  clinicalPattern?: string;
  pattern?: string;
  pivotClue?: string;
  commonTrap?: string;
  managementPearl?: string;
  management?: string;
  boardPearl: string;
};

type ClinicalComparison = TutorContent["comparison"];

type ComparisonTemplate = {
  competingDiagnosis: string;
  rows: ClinicalComparison["rows"];
};

const comparisonTemplates: Record<string, ComparisonTemplate> = {
  "gestational hypertension": {
    competingDiagnosis: "Preeclampsia",
    rows: [
      {
        feature: "Typical presentation",
        correct: "New hypertension after 20 weeks without proteinuria or severe features",
        competing: "Hypertension after 20 weeks with proteinuria or severe features"
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: "No proteinuria and no severe-feature symptoms or labs",
        competing: "Present, or severe features may establish diagnosis without proteinuria: thrombocytopenia, elevated LFTs, renal dysfunction, pulmonary edema, or neurologic symptoms"
      },
      {
        feature: "Immediate management",
        correct: "Monitor maternal BP and fetal well-being; treat severe-range BP if it appears",
        competing: "Delivery timing depends on gestational age and severity; magnesium sulfate if severe features"
      },
      {
        feature: "NBME discriminator",
        correct: "Hypertension alone after 20 weeks is not enough for preeclampsia",
        competing: "Proteinuria or any severe feature converts the diagnosis"
      },
      {
        feature: "Common trap",
        correct: "Stopping at 'hypertension after 20 weeks'",
        competing: "Naming preeclampsia before proving proteinuria or end-organ involvement"
      }
    ]
  },
  "placental abruption": {
    competingDiagnosis: "Placenta previa",
    rows: [
      {
        feature: "Typical presentation",
        correct: "Painful third-trimester bleeding with contractions and uterine tenderness",
        competing: "Painless bright red third-trimester bleeding"
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: "Tender, rigid uterus points to placental separation",
        competing: "Soft, nontender uterus points to placenta covering the cervical os"
      },
      {
        feature: "Pathophysiology",
        correct: "Premature separation of the placenta from the uterine wall",
        competing: "Placenta implants over or near the cervical os"
      },
      {
        feature: "Immediate management",
        correct: "Stabilize the mother; deliver if maternal or fetal instability is present",
        competing: "Localize placenta by ultrasound before any digital cervical exam"
      },
      {
        feature: "NBME discriminator",
        correct: "Pain plus uterine tenderness is abruption until proven otherwise",
        competing: "Painless bleeding is previa until ultrasound excludes it"
      }
    ]
  },
  "placenta previa": {
    competingDiagnosis: "Placental abruption",
    rows: [
      {
        feature: "Typical presentation",
        correct: "Painless bright red bleeding in the third trimester",
        competing: "Painful bleeding with contractions and a tender uterus"
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: "No uterine tenderness; bleeding is painless",
        competing: "Tender, rigid uterus or painful contractions"
      },
      {
        feature: "Pathophysiology",
        correct: "Placenta overlies or approaches the cervical os",
        competing: "Placenta separates from the uterine wall before delivery"
      },
      {
        feature: "Immediate management",
        correct: "Transvaginal ultrasound to localize placenta; avoid digital exam",
        competing: "Maternal stabilization and delivery decision based on instability"
      },
      {
        feature: "NBME discriminator",
        correct: "Painless bleeding means do not examine the cervix digitally until previa is excluded",
        competing: "Pain and uterine tenderness shift the answer to abruption"
      }
    ]
  },
  "category i fetal tracing": {
    competingDiagnosis: "Category II tracing",
    rows: [
      {
        feature: "Typical presentation",
        correct: "Baseline 110-160 with moderate variability and no concerning decelerations",
        competing: "Indeterminate tracing: not Category I, but not Category III"
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: "Moderate variability is reassuring",
        competing: "Variable, late, prolonged decelerations, tachycardia, bradycardia, or minimal variability make it indeterminate"
      },
      {
        feature: "Immediate management",
        correct: "Continue routine monitoring",
        competing: "Intrauterine resuscitation and reassessment"
      },
      {
        feature: "NBME discriminator",
        correct: "Moderate variability without recurrent decelerations is normal",
        competing: "Any recurrent deceleration pattern moves the tracing out of Category I"
      },
      {
        feature: "Common trap",
        correct: "Overreacting to a reassuring tracing",
        competing: "Treating an indeterminate tracing as immediately ominous without Category III criteria"
      }
    ]
  },
  "vulvovaginal candidiasis": {
    competingDiagnosis: "Bacterial vaginosis",
    rows: [
      {
        feature: "Typical presentation",
        correct: "Vulvar pruritus with thick white discharge",
        competing: "Thin gray discharge with fishy odor"
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: "Pseudohyphae or budding yeast on microscopy",
        competing: "Clue cells and positive whiff test"
      },
      {
        feature: "Pathophysiology",
        correct: "Candida overgrowth",
        competing: "Vaginal flora shift with Gardnerella-associated anaerobes"
      },
      {
        feature: "Immediate management",
        correct: "Topical azole or oral fluconazole if not pregnant",
        competing: "Metronidazole for symptomatic disease"
      },
      {
        feature: "NBME discriminator",
        correct: "Pruritus plus pseudohyphae beats discharge color",
        competing: "Fishy odor plus clue cells beats nonspecific discharge"
      }
    ]
  },
  "bacterial vaginosis": {
    competingDiagnosis: "Vulvovaginal candidiasis",
    rows: [
      {
        feature: "Typical presentation",
        correct: "Thin gray discharge with fishy odor",
        competing: "Thick white discharge with vulvar pruritus"
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: "Clue cells on wet mount",
        competing: "Pseudohyphae or budding yeast"
      },
      {
        feature: "Pathophysiology",
        correct: "Loss of lactobacilli with anaerobic overgrowth",
        competing: "Candida overgrowth"
      },
      {
        feature: "Immediate management",
        correct: "Metronidazole for symptomatic disease",
        competing: "Topical azole or oral fluconazole if not pregnant"
      },
      {
        feature: "NBME discriminator",
        correct: "Fishy odor and clue cells identify BV",
        competing: "Pruritus and pseudohyphae identify candidiasis"
      }
    ]
  },
  "carboprost contraindication": {
    competingDiagnosis: "Methylergonovine contraindication",
    rows: [
      { feature: "Typical presentation", correct: "Postpartum hemorrhage where carboprost is being considered", competing: "Postpartum hemorrhage where methylergonovine is being considered" },
      { feature: "Highest-yield distinguishing clue", correct: "Asthma", competing: "Hypertension" },
      { feature: "Pathophysiology", correct: "Prostaglandin F2-alpha can trigger bronchospasm", competing: "Ergot alkaloid vasoconstriction can worsen hypertension" },
      { feature: "Immediate management", correct: "Avoid carboprost and choose another uterotonic", competing: "Avoid methylergonovine and choose another uterotonic" },
      { feature: "NBME discriminator", correct: "Asthma excludes carboprost", competing: "Hypertension excludes methylergonovine" }
    ]
  }
};

function sentence(value?: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function getDiagnosis(decision: ComparisonDecision) {
  return decision.topic ?? decision.diagnosis ?? decision.correctAnswer;
}

function getPattern(decision: ComparisonDecision) {
  return sentence(decision.clinicalPattern ?? decision.pattern);
}

function getManagement(decision: ComparisonDecision) {
  return sentence(decision.managementPearl ?? decision.management);
}

function getPivot(decision: ComparisonDecision) {
  return sentence(decision.pivotClue);
}

export function buildClinicalComparison(decision: ComparisonDecision): ClinicalComparison {
  const diagnosis = getDiagnosis(decision);
  const template = comparisonTemplates[normalizeAnswer(diagnosis)];

  if (template) {
    return {
      correctDiagnosis: diagnosis,
      competingDiagnosis: template.competingDiagnosis,
      rows: template.rows
    };
  }

  const competingDiagnosis = sentence(decision.commonTrap) || "Closest competing diagnosis";
  const pattern = getPattern(decision) || sentence(decision.boardPearl);
  const pivot = getPivot(decision) || sentence(decision.boardPearl);
  const management = getManagement(decision) || "Management follows the confirmed diagnosis and patient stability";

  return {
    correctDiagnosis: diagnosis,
    competingDiagnosis,
    rows: [
      {
        feature: "Typical presentation",
        correct: pattern,
        competing: `${competingDiagnosis} has its own defining presentation; it is not established by this vignette alone`
      },
      {
        feature: "Highest-yield distinguishing clue",
        correct: pivot,
        competing: `The stem would need the defining clue for ${competingDiagnosis}, not just overlapping symptoms`
      },
      {
        feature: "Immediate management",
        correct: management,
        competing: `Management changes only after the evidence supports ${competingDiagnosis}`
      },
      {
        feature: "NBME discriminator",
        correct: sentence(decision.boardPearl),
        competing: `Do not switch answers unless the vignette gives the discriminator for ${competingDiagnosis}`
      }
    ]
  };
}
