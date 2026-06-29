import type { VignetteFindingAnnotation, VignetteFindingRole } from "@/types/practice";

export const VIGNETTE_FINDING_TAG_PREFIX = "vignette_finding::";

const findingRoles = new Set<VignetteFindingRole>(["context", "supporting", "pivot_clue", "neutral", "noise"]);

type VignetteAnnotationSource = {
  prompt?: string | null;
  topic?: string | null;
  clinicalPattern?: string | null;
  decisionType?: string | null;
  pivotClue?: string | null;
  commonTrap?: string | null;
  managementPearl?: string | null;
  tags?: string[];
};

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim().replace(/[.]+$/, "") ?? "";
}

function sentence(value?: string | null) {
  const cleaned = clean(value);
  return cleaned ? `${cleaned}.` : "";
}

function hasPhrase(prompt: string, phrase?: string | null) {
  const cleaned = clean(phrase);
  return Boolean(cleaned && prompt.toLowerCase().includes(cleaned.toLowerCase()));
}

function firstVisiblePhrase(prompt: string) {
  const firstSentence = prompt.split(/[.!?]/).map((item) => item.trim()).find(Boolean) ?? prompt;
  const phrase = firstSentence.length > 120 ? firstSentence.slice(0, 120).replace(/\s+\S*$/, "") : firstSentence;

  return clean(phrase);
}

function visibleOrFallback(prompt: string, preferred?: string | null) {
  return hasPhrase(prompt, preferred) ? clean(preferred) : firstVisiblePhrase(prompt);
}

function addFinding(
  findings: VignetteFindingAnnotation[],
  prompt: string,
  text: string | undefined | null,
  role: VignetteFindingRole,
  explanation?: string
) {
  const cleaned = clean(text);
  if (!cleaned || !hasPhrase(prompt, cleaned)) {
    return;
  }

  const key = cleaned.toLowerCase();
  if (findings.some((finding) => clean(finding.text).toLowerCase() === key)) {
    return;
  }

  findings.push({
    text: cleaned,
    role,
    ...(explanation ? { explanation } : {})
  });
}

function isShortPrompt(prompt: string) {
  const sentences = prompt.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  return prompt.length < 95 || sentences.length < 2;
}

export function parseVignetteFindingTags(tags: string[]): VignetteFindingAnnotation[] {
  const findings: VignetteFindingAnnotation[] = [];

  tags.forEach((tag) => {
    if (!tag.startsWith(VIGNETTE_FINDING_TAG_PREFIX)) {
      return;
    }

    try {
      const parsed = JSON.parse(tag.slice(VIGNETTE_FINDING_TAG_PREFIX.length)) as Partial<VignetteFindingAnnotation>;
      const text = parsed.text?.trim();
      const role = parsed.role;

      if (!text || !role || !findingRoles.has(role)) {
        return;
      }

      const explanation = parsed.explanation?.trim();
      findings.push({
        text,
        role,
        ...(explanation ? { explanation } : {})
      });
    } catch {
      // Ignore malformed authoring metadata rather than rendering untrusted annotations.
    }
  });

  return findings;
}

export function buildDisplayVignette(source: VignetteAnnotationSource) {
  const prompt = clean(source.prompt);
  if (!isShortPrompt(prompt)) {
    return prompt;
  }

  const pattern = clean(source.clinicalPattern || prompt);
  const pivot = clean(source.pivotClue || source.clinicalPattern);
  const task = clean(source.decisionType);
  const topic = clean(source.topic).replace(/\bcontraindication contraindication\b/gi, "contraindication");
  const management = clean(source.managementPearl);
  const normalizedTask = task.toLowerCase();
  const decisionContext = (() => {
    if (normalizedTask === "diagnosis") {
      return "Name the diagnosis supported by this pattern.";
    }

    if (normalizedTask.includes("contraindication")) {
      return "Identify the option that should be avoided in this context.";
    }

    if (normalizedTask.includes("management") || normalizedTask.includes("treatment") || normalizedTask.includes("step")) {
      return "Choose the best next management step.";
    }

    if (task) {
      return `Make the ${normalizedTask} decision from the clinical evidence.`;
    }

    return topic ? `The case centers on ${topic}.` : "";
  })();

  return [
    pattern ? `A patient presents with ${pattern.toLowerCase()}.` : sentence(prompt),
    pivot ? `The pivot finding is ${pivot.toLowerCase()}.` : "",
    decisionContext,
    management ? `${management}.` : ""
  ].filter(Boolean).join(" ");
}

export function buildDerivedVignetteFindings(source: VignetteAnnotationSource): VignetteFindingAnnotation[] {
  const displayPrompt = buildDisplayVignette(source);
  const findings: VignetteFindingAnnotation[] = [];
  const pivot = clean(source.pivotClue || source.clinicalPattern);
  const correctContext = clean(source.topic);
  const pivotText = visibleOrFallback(displayPrompt, pivot);
  const contextText = visibleOrFallback(displayPrompt, source.clinicalPattern);

  addFinding(
    findings,
    displayPrompt,
    pivotText,
    "pivot_clue",
    pivot && correctContext ? `${pivot} is the pivot clue for ${correctContext}.` : undefined
  );
  addFinding(findings, displayPrompt, contextText, "context");
  addFinding(findings, displayPrompt, source.managementPearl, "supporting");
  addFinding(
    findings,
    displayPrompt,
    source.commonTrap,
    "noise",
    source.commonTrap ? `${clean(source.commonTrap)} is a nearby distractor; look for the pivot clue before choosing it.` : undefined
  );

  return findings;
}

export function buildPracticeVignetteAnnotations(source: VignetteAnnotationSource) {
  const displayStem = buildDisplayVignette(source);
  const authored = parseVignetteFindingTags(source.tags ?? []);
  const derived = buildDerivedVignetteFindings({ ...source, prompt: displayStem });

  return {
    displayStem,
    vignetteFindings: authored.length > 0 ? authored : derived
  };
}
