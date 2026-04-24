function extractReferencedA1Notations_(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const matches = value.match(/\$?[A-Za-z]{1,3}\$?\d+/g) || [];
  const seen = Object.create(null);
  const unique = [];

  for (let index = 0; index < matches.length; index += 1) {
    const candidate = String(matches[index] || "").toUpperCase().replace(/\$/g, "");
    if (!candidate || seen[candidate]) {
      continue;
    }

    seen[candidate] = true;
    unique.push(candidate);

    if (unique.length >= 20) {
      break;
    }
  }

  return unique;
}

if (typeof module !== "undefined") {
  module.exports = {
    extractReferencedA1Notations_
  };
}
