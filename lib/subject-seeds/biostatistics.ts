import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Biostatistics" as const;

const topics = [
  ["sensitivity", "probability of a positive test among people with disease", "SnNout screening logic", "high sensitivity helps rule out when negative"],
  ["specificity", "probability of a negative test among people without disease", "SpPin confirmation logic", "high specificity helps rule in when positive"],
  ["PPV", "probability disease is present when the test is positive", "depends on prevalence", "PPV rises when prevalence rises"],
  ["NPV", "probability disease is absent when the test is negative", "depends on prevalence", "NPV falls when prevalence rises"],
  ["likelihood ratios", "test result shifts pretest odds to posttest odds", "LR+ and LR- quantify diagnostic movement", "strong LRs change probability more"],
  ["relative risk", "risk in exposed divided by risk in unexposed", "cohort-style comparison", "RR measures association in risk terms"],
  ["odds ratio", "odds of exposure or outcome ratio", "case-control association measure", "OR approximates RR when disease is rare"],
  ["absolute risk reduction", "control event rate minus treatment event rate", "absolute benefit size", "ARR determines NNT"],
  ["number needed to treat", "one divided by absolute risk reduction", "patients treated for one additional benefit", "NNT uses absolute, not relative, risk"],
  ["confidence intervals", "range of plausible effect estimates", "crossing null means not statistically significant for common ratios", "CI shows precision"],
  ["p values", "probability of data as extreme assuming null is true", "statistical significance threshold", "p value does not measure effect size"],
  ["bias", "systematic error in study design or measurement", "selection, measurement, recall, or lead-time pattern", "bias threatens validity"],
  ["confounding", "third variable associated with exposure and outcome", "distorts observed association", "control by randomization, restriction, matching, or adjustment"],
  ["intention-to-treat", "analyze participants in assigned groups", "preserves randomization", "protects against attrition-related bias"]
] as const;

export const biostatisticsSeeds: RapidRoundsConceptSeed[] = topics.map(([topic, pivot, support, discriminator]) =>
  createConceptSeed(subject, topic, {
    schema: `${topic} quantitative reasoning schema`,
    questionArchetypes: ["Biostatistics"],
    pivotClues: [pivot],
    supportingClues: [support],
    contextualClues: ["study design, denominator, and clinical question determine the calculation"],
    commonTraps: [`using the wrong denominator for ${topic}`],
    primaryDiscriminators: [discriminator],
    secondaryDiscriminators: ["identify numerator and denominator before calculating"],
    managementRules: [`For ${topic}, define the denominator before interpreting the result.`],
    contraindications: [],
    relatedConcepts: ["epidemiology", "diagnostic testing", "study design"],
    guidelineReferences: ["Public epidemiology and biostatistics teaching standards"]
  })
);
