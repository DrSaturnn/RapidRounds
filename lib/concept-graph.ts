import { normalizeAnswer } from "@/lib/answer-check";

export type ConceptGraph = {
  primaryConcept: string;
  parentConcept: string;
  relatedConcepts: string[];
  managementConcepts: string[];
};

type ConceptGraphInput = {
  correctAnswer: string;
  comparisonConcept?: string;
  managementConcept?: string;
};

const conceptGraphMap: Record<string, ConceptGraph> = {
  "gestational hypertension": {
    primaryConcept: "Gestational hypertension",
    parentConcept: "Hypertensive disorders of pregnancy",
    relatedConcepts: [
      "Preeclampsia",
      "HELLP syndrome",
      "Eclampsia",
      "Chronic hypertension",
      "Superimposed preeclampsia"
    ],
    managementConcepts: [
      "Severe features",
      "Delivery timing",
      "Magnesium prophylaxis",
      "Antihypertensives",
      "Fetal surveillance"
    ]
  },
  "ectopic pregnancy": {
    primaryConcept: "Ectopic pregnancy",
    parentConcept: "First-trimester bleeding",
    relatedConcepts: [
      "Threatened abortion",
      "Inevitable abortion",
      "Incomplete abortion",
      "Molar pregnancy",
      "Pregnancy of unknown location"
    ],
    managementConcepts: [
      "Hemodynamic stability",
      "Methotrexate criteria",
      "Surgical management",
      "Serial beta-hCG",
      "Rh immune globulin"
    ]
  },
  "placental abruption": {
    primaryConcept: "Placental abruption",
    parentConcept: "Antepartum bleeding",
    relatedConcepts: [
      "Placenta previa",
      "Vasa previa",
      "Uterine rupture",
      "Preterm labor",
      "Fetal distress"
    ],
    managementConcepts: [
      "Maternal stabilization",
      "Fetal monitoring",
      "Delivery decision",
      "Coagulopathy assessment",
      "Avoid digital exam until previa excluded"
    ]
  }
};

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function getConceptGraph({
  correctAnswer,
  comparisonConcept,
  managementConcept
}: ConceptGraphInput): ConceptGraph {
  const normalizedAnswer = normalizeAnswer(correctAnswer);
  const mapped = conceptGraphMap[normalizedAnswer];

  if (mapped) {
    return mapped;
  }

  return {
    primaryConcept: titleCase(correctAnswer.trim() || "Current concept"),
    parentConcept: "Clinical reasoning",
    relatedConcepts: unique([comparisonConcept ?? ""]),
    managementConcepts: unique([managementConcept ?? ""])
  };
}
