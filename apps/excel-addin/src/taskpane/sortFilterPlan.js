function isColumnRef(value) {
  return typeof value === "string" || Number.isInteger(value);
}

function formatColumnRef(columnRef) {
  return String(columnRef);
}

function formatSortDirection(direction) {
  return direction === "desc" ? "descending" : "ascending";
}

export function isRangeSortPlan(plan) {
  return Boolean(
    plan &&
    typeof plan.targetSheet === "string" &&
    typeof plan.targetRange === "string" &&
    Array.isArray(plan.keys) &&
    plan.keys.length > 0
  );
}

export function isRangeFilterPlan(plan) {
  return Boolean(
    plan &&
    typeof plan.targetSheet === "string" &&
    typeof plan.targetRange === "string" &&
    Array.isArray(plan.conditions) &&
    plan.conditions.length > 0
  );
}

export function buildExcelSortFields(plan) {
  return plan.keys
    .filter((key) => isColumnRef(key?.columnRef))
    .map((key) => ({
      key: key.columnRef,
      ascending: key.direction !== "desc"
    }));
}

export function getRangeSortStatusSummary(plan) {
  const keySummary = Array.isArray(plan?.keys) && plan.keys.length > 0
    ? ` by ${plan.keys
      .filter((key) => isColumnRef(key?.columnRef))
      .map((key) => `${formatColumnRef(key.columnRef)} (${formatSortDirection(key.direction)})`)
      .join(", ")}`
    : "";

  return `Sorted ${plan.targetSheet}!${plan.targetRange}${keySummary}.`;
}

export function getRangeFilterStatusSummary(plan) {
  return `Applied filter to ${plan.targetSheet}!${plan.targetRange}.`;
}
