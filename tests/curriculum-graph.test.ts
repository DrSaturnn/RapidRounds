import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  curriculumNodes,
  getCurriculumLearningItems,
  getCurriculumNode,
  getCurriculumNodesForQuestion,
  getShelfViewNodes,
  questionCurriculumMap
} from "@/lib/curriculum-graph";
import { getLearningTrajectory } from "@/lib/learning-trajectory";

describe("master curriculum graph", () => {
  it("exports valid curriculum nodes with stable relationships", () => {
    assert.ok(curriculumNodes.length >= 90);

    const ids = new Set(curriculumNodes.map((node) => node.id));
    assert.equal(ids.size, curriculumNodes.length);

    for (const node of curriculumNodes) {
      assert.ok(node.id.length > 0);
      assert.ok(node.title.length > 0);
      assert.ok(node.shelfTags.length > 0);
      assert.ok(node.clinicalContextTags.length > 0);
      assert.ok(node.systemTags.length > 0);
      assert.ok(node.disciplineTags.length > 0);
      assert.ok(node.decisionTypeTags.length > 0);
      assert.match(node.priority, /^(core|high|medium|low)$/);

      for (const linkedId of [
        ...(node.parentIds ?? []),
        ...(node.prerequisiteIds ?? []),
        ...(node.successorIds ?? []),
        ...(node.relatedIds ?? []),
        ...(node.commonDistractorIds ?? [])
      ]) {
        assert.ok(ids.has(linkedId), `${node.id} links to missing node ${linkedId}`);
      }
    }
  });

  it("creates top-level cross-shelf clinical contexts", () => {
    [
      "pregnancy",
      "postpartum",
      "preventive-care",
      "emergency-presentations",
      "inpatient-medicine",
      "pediatrics-neonatology",
      "psychiatry-behavioral-health",
      "surgery-acute-abdomen",
      "womens-health",
      "geriatrics",
      "chronic-disease-management"
    ].forEach((id) => assert.ok(getCurriculumNode(id), id));
  });

  it("builds Pregnancy across OB, IM, Surgery, Psychiatry, Pediatrics, Family Medicine, and Ethics", () => {
    const pregnancyBranchIds = [
      "core-obstetrics",
      "internal-medicine-in-pregnancy",
      "surgery-acute-abdomen-in-pregnancy",
      "psychiatry-pregnancy-postpartum",
      "neonatology-connected-to-pregnancy",
      "family-preventive-care-in-pregnancy",
      "ethics-in-pregnancy"
    ];

    for (const id of pregnancyBranchIds) {
      const node = getCurriculumNode(id);
      assert.ok(node, id);
      assert.ok(node.parentIds?.includes("pregnancy"));
    }
  });

  it("maps existing and planned decisions to multiple curriculum nodes", () => {
    const preeclampsia = getCurriculumNodesForQuestion("Preeclampsia with severe features").map((node) => node.id);
    const abruption = getCurriculumNodesForQuestion("Placental abruption").map((node) => node.id);
    const postpartumHemorrhage = getCurriculumNodesForQuestion("Initial postpartum hemorrhage management").map((node) => node.id);
    const gbs = getCurriculumNodesForQuestion("GBS prophylaxis").map((node) => node.id);
    const psychosis = getCurriculumNodesForQuestion("Postpartum psychosis").map((node) => node.id);

    assert.deepEqual(questionCurriculumMap["preeclampsia-with-severe-features"], [
      "pregnancy",
      "hypertensive-disorders-pregnancy",
      "preeclampsia-with-severe-features",
      "emergency-presentations",
      "internal-medicine-in-pregnancy"
    ]);
    assert.ok(preeclampsia.includes("internal-medicine-in-pregnancy"));
    assert.ok(abruption.includes("emergency-presentations"));
    assert.ok(postpartumHemorrhage.includes("postpartum-hemorrhage"));
    assert.ok(gbs.includes("neonatology-connected-to-pregnancy"));
    assert.ok(psychosis.includes("psychiatry-behavioral-health"));
  });

  it("supports shelf filters with cross-disciplinary pregnancy content", () => {
    const obgynTitles = getShelfViewNodes("OB/GYN").map((node) => node.title);

    assert.ok(obgynTitles.includes("Core Obstetrics"));
    assert.ok(obgynTitles.includes("Internal Medicine in Pregnancy"));
    assert.ok(obgynTitles.includes("Surgery / Acute Abdomen in Pregnancy"));
    assert.ok(obgynTitles.includes("Psychiatry in Pregnancy and Postpartum"));
    assert.ok(obgynTitles.includes("Pediatrics / Neonatology Connected to Pregnancy"));
    assert.ok(obgynTitles.includes("Family Medicine / Preventive Care in Pregnancy"));
    assert.ok(obgynTitles.includes("Ethics in Pregnancy"));
  });

  it("feeds curriculum relationships into Continue Learning recommendations", () => {
    const severePreeclampsia = getLearningTrajectory({
      correctAnswer: "Preeclampsia with severe features",
      wasCorrect: true
    });
    const abruption = getCurriculumLearningItems("Placental abruption", false);

    assert.equal(severePreeclampsia.recommendation?.concept, "Magnesium sulfate");
    assert.match(severePreeclampsia.recommendation?.reason ?? "", /Builds directly on Preeclampsia with severe features/);
    assert.ok(abruption.items.some((item) => item.concept === "Placenta previa"));
    assert.ok(abruption.items.some((item) => /Frequently confused/.test(item.reason)));
  });
});
