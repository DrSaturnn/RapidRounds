import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const clinicalDir = "components/clinical";

function readClinicalFile(fileName: string): string {
  return readFileSync(join(clinicalDir, fileName), "utf8");
}

describe("clinical composite components", () => {
  it("provides the Phase 2D composite component inventory", () => {
    [
      "SemanticChip.tsx",
      "ClinicalFindingRow.tsx",
      "PatientWorkspace.tsx",
      "ReasoningWorkspace.tsx",
      "DiscriminatorTable.tsx",
      "CommitCard.tsx",
      "AsterPresence.tsx",
      "index.ts",
      "types.ts"
    ].forEach((fileName) => {
      assert.ok(readdirSync(clinicalDir).includes(fileName), `${fileName} should exist`);
    });
  });

  it("keeps composites outside the primitive design-system layer", () => {
    const uiIndex = readFileSync("components/ui/index.ts", "utf8");
    const clinicalIndex = readClinicalFile("index.ts");

    assert.doesNotMatch(uiIndex, /clinical/i);
    [
      "AsterPresence",
      "ClinicalFindingRow",
      "CommitCard",
      "DiscriminatorTable",
      "PatientWorkspace",
      "ReasoningWorkspace",
      "SemanticChip"
    ].forEach((exportName) => assert.match(clinicalIndex, new RegExp(exportName)));
  });

  it("builds clinical composites from primitives rather than engine modules", () => {
    const componentSource = readdirSync(clinicalDir)
      .filter((fileName) => fileName.endsWith(".tsx"))
      .map(readClinicalFile)
      .join("\n");

    assert.match(componentSource, /from "@\/components\/ui"/);
    assert.doesNotMatch(componentSource, /from "@\/lib\//);
    assert.doesNotMatch(componentSource, /from "@\/hooks\//);
    assert.doesNotMatch(componentSource, /from "@\/app\//);
    assert.doesNotMatch(componentSource, /from "@\/prisma\//);
  });

  it("models reasoning semantics as roles on SemanticChip", () => {
    const semanticChip = readClinicalFile("SemanticChip.tsx");
    const types = readClinicalFile("types.ts");

    [
      "pattern",
      "supporting",
      "pivot",
      "learner",
      "expert",
      "overlap",
      "discriminator",
      "repair",
      "commit",
      "noise"
    ].forEach((role) => {
      assert.match(types, new RegExp(`"${role}"`));
      assert.match(semanticChip, new RegExp(`${role}:`));
    });

    assert.match(semanticChip, /semanticRole=\{role\}/);
    assert.doesNotMatch(semanticChip, /variant="pivot"/);
    assert.doesNotMatch(semanticChip, /variant="expert"/);
  });

  it("limits Phase 2E composite screen assembly to the flagged PracticePanel pre-answer path", () => {
    const practicePanel = readFileSync("components/PracticePanel.tsx", "utf8");
    const tutorMode = readFileSync("components/TutorMode.tsx", "utf8");
    const teachingCard = readFileSync("components/TeachingCard.tsx", "utf8");

    assert.match(practicePanel, /@\/components\/clinical/);
    assert.match(practicePanel, /RECOGNITION_CHALLENGE_COMPOSITES_ENABLED/);
    assert.match(practicePanel, /useRecognitionCompositePreAnswer/);

    [tutorMode, teachingCard].forEach((source) => {
      assert.doesNotMatch(source, /@\/components\/clinical/);
      assert.doesNotMatch(source, /components\/clinical/);
    });
  });

  it("defines token-backed composite styling without screen-specific selectors", () => {
    const css = readFileSync("app/globals.css", "utf8");

    [
      ".rr-clinical-finding-row",
      ".rr-patient-workspace",
      ".rr-reasoning-composite-workspace",
      ".rr-discriminator-composite",
      ".rr-discriminator-table",
      ".rr-commit-card",
      ".rr-aster-presence-shell"
    ].forEach((className) => assert.match(css, new RegExp(className.replace(".", "\\."))));

    assert.match(css, /var\(--rr-semantic-pivot\)/);
    assert.match(css, /var\(--rr-semantic-learner\)/);
    assert.match(css, /var\(--rr-semantic-expert\)/);
    assert.doesNotMatch(css, /\.rr-patient-workspace[\s\S]*PracticePanel/);
  });
});
