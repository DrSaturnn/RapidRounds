import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildTutorContent } from "@/lib/tutor-content";

const annotatedDecision = {
  specialty: "Obstetrics",
  system: "Antepartum Bleeding",
  topic: "Placenta previa",
  clinicalPattern: "Third-trimester bleeding",
  decisionType: "Diagnosis",
  prompt:
    "A 32-year-old G2P1 woman at 32 weeks' gestation presents with bright red vaginal bleeding. She denies abdominal pain or contractions. Vital signs are stable.",
  correctAnswer: "placenta previa",
  acceptedAnswers: JSON.stringify(["placenta previa", "previa"]),
  boardPearl: "Painless third-trimester bleeding is placenta previa until proven otherwise.",
  pivotClue: "Denies abdominal pain or contractions",
  commonTrap: "placental abruption",
  managementPearl: "Avoid digital cervical exam until previa is excluded.",
  tags: JSON.stringify([
    "third trimester bleeding",
    "previa",
    `vignette_finding::${JSON.stringify({ text: "32 weeks' gestation", role: "context" })}`,
    `vignette_finding::${JSON.stringify({ text: "bright red bleeding", role: "supporting" })}`,
    `vignette_finding::${JSON.stringify({
      text: "denies abdominal pain or contractions",
      role: "pivot_clue",
      explanation: "Painless bleeding distinguishes placenta previa from placental abruption."
    })}`,
    `vignette_finding::${JSON.stringify({ text: "vital signs are stable", role: "neutral" })}`
  ])
};

describe("vignette attention map", () => {
  it("parses authored vignette finding annotations into tutor content", () => {
    const tutor = buildTutorContent(annotatedDecision, "placental abruption");

    assert.equal(tutor.vignetteFindings?.length, 4);
    assert.deepEqual(tutor.vignetteFindings?.map((finding) => finding.role), [
      "context",
      "supporting",
      "pivot_clue",
      "neutral"
    ]);
    assert.equal(tutor.vignetteFindings?.[2]?.text, "denies abdominal pain or contractions");
    assert.match(tutor.vignetteFindings?.[2]?.explanation ?? "", /distinguishes placenta previa/);
    assert.doesNotMatch(JSON.stringify(tutor.illnessScript.buzzwords), /vignette_finding/);
  });

  it("does not create an attention map when annotation metadata is absent", () => {
    const tutor = buildTutorContent(
      {
        ...annotatedDecision,
        tags: JSON.stringify(["third trimester bleeding", "previa"])
      },
      "placental abruption"
    );

    assert.equal(tutor.vignetteFindings, undefined);
  });

  it("renders the attention map only when findings exist", () => {
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    assert.match(tutorMode, /hasVignetteFindings/);
    assert.match(tutorMode, /<VignetteAttentionMap findings=\{tutor\.vignetteFindings \?\? \[\]\} \/>/);
    assert.match(tutorMode, /What the vignette was telling you/);
    assert.match(css, /rr-attention-map-pivot-clue/);
  });

  it("adds exactly one authored demo annotation to the seed file", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    const matches = seed.match(/vignetteFindings:/g) ?? [];

    assert.equal(matches.length, 1);
    assert.match(seed, /denies abdominal pain or contractions/);
    assert.match(seed, /Painless bleeding distinguishes placenta previa from placental abruption/);
  });
});
