export function extractReferencedA1Notations(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const matches = value.match(/\$?[A-Za-z]{1,3}\$?\d+/g) || [];
  const seen = new Set();
  const unique = [];

  for (const match of matches) {
    const candidate = String(match || "").toUpperCase().replaceAll("$", "");
    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    unique.push(candidate);

    if (unique.length >= 20) {
      break;
    }
  }

  return unique;
}

export function getPromptReferencedA1Notations(value, activeCellA1) {
  const activeCell = typeof activeCellA1 === "string"
    ? activeCellA1.toUpperCase().replaceAll("$", "")
    : "";

  return extractReferencedA1Notations(value).filter((candidate) => candidate !== activeCell);
}
