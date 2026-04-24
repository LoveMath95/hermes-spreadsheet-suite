export function rangeHasExistingContent(values) {
  return Array.isArray(values) && values.some((row) =>
    Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && cell !== "")
  );
}
