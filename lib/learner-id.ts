const ANONYMOUS_LEARNER_ID_PATTERN = /^anon_[A-Za-z0-9][A-Za-z0-9_-]{7,}$/;
export const LOCAL_DEMO_LEARNER_ID = "local-demo-user";

export function normalizeLearnerId(value?: string | null) {
  const learnerId = value?.trim();

  if (learnerId === LOCAL_DEMO_LEARNER_ID) {
    return learnerId;
  }

  return learnerId && ANONYMOUS_LEARNER_ID_PATTERN.test(learnerId) ? learnerId : undefined;
}
