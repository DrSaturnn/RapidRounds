const ANONYMOUS_LEARNER_ID_PATTERN = /^anon_[A-Za-z0-9][A-Za-z0-9_-]{7,}$/;

export function normalizeLearnerId(value?: string | null) {
  const learnerId = value?.trim();

  return learnerId && ANONYMOUS_LEARNER_ID_PATTERN.test(learnerId) ? learnerId : undefined;
}
