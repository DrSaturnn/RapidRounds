import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Ethics" as const;

const topics = [
  ["decision-making capacity", "understand, appreciate, reason, and communicate a choice", "task-specific capacity", "capacity is decision-specific"],
  ["substituted judgment", "use patient's known wishes through surrogate", "surrogate applies patient values", "separate from best-interest standard"],
  ["informed consent", "risks, benefits, alternatives, and understanding", "voluntary decision", "consent requires adequate disclosure"],
  ["refusal of treatment", "capacitated patient refusing recommended care", "explain risks and alternatives", "respect informed refusal"],
  ["confidentiality", "private medical information with limited exceptions", "patient permission or legal duty", "do not disclose without justification"],
  ["adolescent consent", "minor confidentiality and specific consent exceptions", "sexual health, pregnancy, substance, or mental health context", "know exception categories"],
  ["mandatory reporting", "legal duty to report abuse or danger", "child/elder abuse or reportable threat", "report when law requires"],
  ["medical error disclosure", "honest disclosure of error and harm", "explain what happened and next steps", "do not conceal errors"],
  ["end-of-life care", "goals of care and symptom relief", "advance directives and code status", "align treatment with patient values"],
  ["organ donation", "brain death or donation eligibility process", "separate care team from donation request", "follow designated donation process"],
  ["impaired physician", "clinician impairment affecting safety", "report through appropriate channels", "protect patients while supporting physician help"]
] as const;

export const ethicsSeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} ethics and professionalism decision schema`,
    questionArchetypes: ["Ethics/capacity", "Prognosis/counseling", "Next best step"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["autonomy, safety, legal duty, and patient values frame ethics decisions"],
    commonTraps: [`choosing paternalistic action instead of applying ${pivot}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["emergency, capacity, and legal reporting duties override ordinary preferences only when applicable"],
    managementRules: [`Apply the core ethics rule to ${topic} before choosing an action.`],
    contraindications: ["avoid breaching confidentiality unless an exception applies"],
    relatedConcepts: ["capacity", "confidentiality", "informed consent"],
    guidelineReferences: ["AMA Code of Medical Ethics"]
  })
);
