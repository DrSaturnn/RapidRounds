import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildTutorContent } from "@/lib/tutor-content";
import { toPracticePromptDto } from "@/lib/clinical-decision-serializers";
import { buildPracticeVignetteAnnotations } from "@/lib/vignette-annotations";

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

  it("derives a runtime attention map when authored annotation metadata is absent", () => {
    const tutor = buildTutorContent(
      {
        ...annotatedDecision,
        tags: JSON.stringify(["third trimester bleeding", "previa"])
      },
      "placental abruption"
    );

    assert.ok(tutor.vignetteFindings?.some((finding) => finding.role === "pivot_clue"));
    assert.ok(tutor.vignetteFindings?.some((finding) => finding.role === "context"));
    assert.match(JSON.stringify(tutor.vignetteFindings), /Denies abdominal pain or contractions/i);
  });

  it("adds display stems and clue annotations to practice DTOs", () => {
    const question = toPracticePromptDto({
      id: "demo-placenta-previa",
      specialty: "OB/GYN",
      system: "Antepartum Bleeding",
      topic: "Placenta previa",
      clinicalPattern: "Third-trimester bleeding",
      decisionType: "Diagnosis",
      prompt:
        "A 32-year-old G2P1 woman at 32 weeks' gestation presents with vaginal bleeding. The bleeding is bright red. She denies abdominal pain or contractions. Vital signs are stable.",
      pivotClue: "denies abdominal pain or contractions",
      commonTrap: "placental abruption",
      managementPearl: "Avoid digital cervical exam until previa is excluded.",
      difficulty: 1,
      tags: JSON.stringify(["third trimester bleeding", "previa"])
    });

    assert.match(question.displayStem ?? "", /32 weeks' gestation/);
    assert.ok(question.vignetteFindings?.some((finding) => finding.role === "pivot_clue"));
    assert.ok(question.vignetteFindings?.some((finding) => finding.role === "context"));
  });

  it("creates an example vignette with highlights when a prompt is too short", () => {
    const vignette = buildPracticeVignetteAnnotations({
      prompt: "Suspected placenta previa.",
      topic: "Placenta previa",
      clinicalPattern: "Third-trimester bleeding",
      decisionType: "Contraindication",
      pivotClue: "Suspected placenta previa",
      managementPearl: "Avoid digital cervical exam until previa is excluded."
    });

    assert.match(vignette.displayStem, /Example vignette:/);
    assert.match(vignette.displayStem, /Third-trimester bleeding/);
    assert.match(vignette.displayStem, /Suspected placenta previa/);
    assert.ok(vignette.vignetteFindings.some((finding) => finding.role === "pivot_clue"));
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

  it("renders question DTO annotations before answer submission", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");

    assert.match(practicePanel, /question\.displayStem \?\? question\.stem/);
    assert.match(practicePanel, /: question\.vignetteFindings \?\? \[\]/);
  });
});
