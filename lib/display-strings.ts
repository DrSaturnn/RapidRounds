export function normalizeDisplayString(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function dedupeDisplayStrings(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  values.forEach((value) => {
    const displayValue = normalizeDisplayString(value);
    const comparisonValue = displayValue.toLowerCase();

    if (!displayValue || seen.has(comparisonValue)) {
      return;
    }

    seen.add(comparisonValue);
    deduped.push(displayValue);
  });

  return deduped;
}
