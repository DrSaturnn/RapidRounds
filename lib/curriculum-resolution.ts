import { normalizeAnswer } from "@/lib/answer-check";
import {
  getCurriculumNode,
  getCurriculumNodeForConcept,
  getCurriculumNodesForQuestion,
  type CurriculumNode
} from "@/lib/curriculum-graph";

type CurriculumDecisionInput = {
  topic?: string | null;
  correctAnswer?: string | null;
  system?: string | null;
  clinicalPattern?: string | null;
  decisionType?: string | null;
  tags?: string | string[] | null;
};

export type ResolvedCurriculumContext = {
  primaryNode?: CurriculumNode;
  nodes: CurriculumNode[];
  shelfTags: string[];
  clinicalContextTags: string[];
  disciplineTags: string[];
  successorConcepts: string[];
  commonDistractors: string[];
  crossShelfReason?: string;
};

const topicNodeAliases: Record<string, string[]> = {
  "methotrexate for ectopic pregnancy": ["methotrexate-ectopic-pregnancy", "ectopic-pregnancy"],
  "chlamydia treatment in pregnancy": ["infections-in-pregnancy", "pregnancy"],
  "endometritis treatment": ["postpartum", "infections-in-pregnancy"],
  "breast abscess": ["mastitis", "breastfeeding-complications", "womens-health"],
  "ovarian torsion management": ["womens-health", "emergency-presentations", "surgery-acute-abdomen"],
  "pregnancy test": ["womens-health", "preventive-care"],
  "endometrial biopsy indication": ["womens-health", "preventive-care"],
  "infertility evaluation timing": ["womens-health", "preventive-care"],
  "clomiphene or letrozole": ["womens-health", "chronic-disease-management"],
  "breast cancer evaluation": ["womens-health", "preventive-care"],
  "endometrial cancer risk factor": ["womens-health", "preventive-care"],
  "combined oral contraceptives": ["womens-health", "preventive-care"],
  "emergency contraception": ["womens-health", "preventive-care", "emergency-presentations"],
  "iud contraindication": ["womens-health", "preventive-care"],
  "depot medroxyprogesterone": ["womens-health", "preventive-care"],
  "genitourinary syndrome of menopause": ["womens-health", "geriatrics"],
  "menopausal vasomotor symptoms": ["womens-health", "geriatrics"],
  "stress urinary incontinence": ["womens-health", "geriatrics"],
  "urge urinary incontinence": ["womens-health", "geriatrics"],
  "pelvic organ prolapse": ["womens-health", "geriatrics"]
};

const systemNodeMap: Record<string, string[]> = {
  "early pregnancy": ["pregnancy", "first-trimester-bleeding", "core-obstetrics"],
  "antepartum bleeding": ["pregnancy", "third-trimester-bleeding", "emergency-presentations"],
  "hypertension in pregnancy": ["pregnancy", "hypertensive-disorders-pregnancy", "internal-medicine-in-pregnancy"],
  "labor and delivery": ["pregnancy", "labor-abnormalities", "core-obstetrics"],
  postpartum: ["postpartum"],
  "infectious gynecology": ["womens-health", "infections-in-pregnancy", "internal-medicine-in-pregnancy"],
  "gynecologic pain": ["womens-health", "emergency-presentations", "surgery-acute-abdomen"],
  "reproductive endocrinology": ["womens-health", "preventive-care"],
  "benign gynecology": ["womens-health"],
  breast: ["womens-health"],
  "gynecologic oncology": ["womens-health"],
  "family planning": ["womens-health", "preventive-care", "family-preventive-care-in-pregnancy"],
  "menopause and urogynecology": ["womens-health", "geriatrics"]
};

function parseTags(tags: CurriculumDecisionInput["tags"]) {
  if (Array.isArray(tags)) {
    return tags;
  }

  if (!tags) {
    return [];
  }

  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [tags];
  } catch {
    return [tags];
  }
}

function uniqueNodes(nodes: Array<CurriculumNode | undefined>) {
  const seen = new Set<string>();
  return nodes.filter((node): node is CurriculumNode => {
    if (!node || seen.has(node.id)) {
      return false;
    }

    seen.add(node.id);
    return true;
  });
}

function nodesFromIds(ids: string[]) {
  return ids.map((id) => getCurriculumNode(id));
}

function keywordNodeIds(input: CurriculumDecisionInput) {
  const text = normalizeAnswer(
    [
      input.topic,
      input.correctAnswer,
      input.system,
      input.clinicalPattern,
      input.decisionType,
      ...parseTags(input.tags)
    ]
      .filter(Boolean)
      .join(" ")
  );
  const ids: string[] = [];

  if (text.includes("pregnan") || text.includes("trimester") || text.includes("fetal")) {
    ids.push("pregnancy");
  }

  if (text.includes("postpartum") || text.includes("puerper")) {
    ids.push("postpartum");
  }

  if (text.includes("emergency") || text.includes("unstable") || text.includes("torsion") || text.includes("rupture")) {
    ids.push("emergency-presentations");
  }

  if (text.includes("infection") || text.includes("vaginitis") || text.includes("pid") || text.includes("chlamydia")) {
    ids.push("infections-in-pregnancy", "womens-health");
  }

  if (text.includes("surgery") || text.includes("torsion") || text.includes("acute abdomen")) {
    ids.push("surgery-acute-abdomen");
  }

  if (text.includes("screen") || text.includes("contraception") || text.includes("counsel")) {
    ids.push("preventive-care");
  }

  return ids;
}

function collectTags(nodes: CurriculumNode[], key: "shelfTags" | "clinicalContextTags" | "disciplineTags") {
  return Array.from(new Set(nodes.flatMap((node) => node[key])));
}

function collectLinkedTitles(nodes: CurriculumNode[], key: "successorIds" | "commonDistractorIds") {
  return Array.from(
    new Set(
      nodes
        .flatMap((node) => node[key] ?? [])
        .map((id) => getCurriculumNode(id)?.title)
        .filter((title): title is string => Boolean(title))
    )
  );
}

function crossShelfReason(nodes: CurriculumNode[]) {
  const node = nodes.find((item) =>
    item.disciplineTags.some((tag) =>
      ["internal medicine", "surgery", "psychiatry", "pediatrics", "family medicine", "emergency medicine", "ethics"].includes(tag)
    )
  );

  return node ? `Cross-shelf overlap: ${node.title}.` : undefined;
}

export function resolveCurriculumContext(input: CurriculumDecisionInput): ResolvedCurriculumContext {
  const topic = input.topic ?? input.correctAnswer ?? "";
  const mappedNodes = getCurriculumNodesForQuestion(topic);
  const exactNode = getCurriculumNodeForConcept(topic) ?? getCurriculumNodeForConcept(input.correctAnswer ?? "");
  const aliasNodes = nodesFromIds(topicNodeAliases[normalizeAnswer(topic)] ?? []);
  const systemNodes = nodesFromIds(systemNodeMap[normalizeAnswer(input.system ?? "")] ?? []);
  const inferredNodes = nodesFromIds(keywordNodeIds(input));
  const nodes = uniqueNodes([exactNode, ...aliasNodes, ...mappedNodes, ...systemNodes, ...inferredNodes]);

  return {
    primaryNode: nodes[0],
    nodes,
    shelfTags: collectTags(nodes, "shelfTags"),
    clinicalContextTags: collectTags(nodes, "clinicalContextTags"),
    disciplineTags: collectTags(nodes, "disciplineTags"),
    successorConcepts: collectLinkedTitles(nodes, "successorIds"),
    commonDistractors: collectLinkedTitles(nodes, "commonDistractorIds"),
    crossShelfReason: crossShelfReason(nodes)
  };
}
