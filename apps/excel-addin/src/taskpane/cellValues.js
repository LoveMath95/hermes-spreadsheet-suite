export const MAX_CONTEXT_CELL_TEXT_LENGTH = 4000;
export const MAX_CONTEXT_HEADER_TEXT_LENGTH = 256;
export const MAX_CONTEXT_FORMULA_LENGTH = 16000;

export function truncateContextText(value, maxLength = MAX_CONTEXT_CELL_TEXT_LENGTH) {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

export function normalizeExcelCellValue(value, maxLength = MAX_CONTEXT_CELL_TEXT_LENGTH) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value === "string" ? truncateContextText(value, maxLength) : value;
  }

  if (value instanceof Date) {
    return truncateContextText(value.toISOString(), maxLength);
  }

  return truncateContextText(String(value), maxLength);
}

export function normalizeExcelMatrixValues(values) {
  return (values || []).map((row) =>
    (row || []).map((cell) => normalizeExcelCellValue(cell))
  );
}

export function normalizeExcelFormulaText(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return truncateContextText(value, MAX_CONTEXT_FORMULA_LENGTH);
}

export function normalizeExcelHeaderText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = truncateContextText(value, MAX_CONTEXT_HEADER_TEXT_LENGTH).trim();
  return normalized.length > 0 ? normalized : null;
}
