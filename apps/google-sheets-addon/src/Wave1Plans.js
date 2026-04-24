const SHEET_STRUCTURE_OPERATIONS_ = new Set([
  "insert_rows",
  "delete_rows",
  "hide_rows",
  "unhide_rows",
  "group_rows",
  "ungroup_rows",
  "insert_columns",
  "delete_columns",
  "hide_columns",
  "unhide_columns",
  "group_columns",
  "ungroup_columns",
  "merge_cells",
  "unmerge_cells",
  "freeze_panes",
  "unfreeze_panes",
  "autofit_rows",
  "autofit_columns",
  "set_sheet_tab_color"
]);

const ROW_OPERATION_LABELS_ = {
  insert_rows: "Inserted",
  delete_rows: "Deleted",
  hide_rows: "Hid",
  unhide_rows: "Unhid",
  group_rows: "Grouped",
  ungroup_rows: "Ungrouped"
};

const COLUMN_OPERATION_LABELS_ = {
  insert_columns: "Inserted",
  delete_columns: "Deleted",
  hide_columns: "Hid",
  unhide_columns: "Unhid",
  group_columns: "Grouped",
  ungroup_columns: "Ungrouped"
};

function formatCount_(count, singular) {
  return count + " " + singular + (count === 1 ? "" : "s");
}

function formatSortDirection_(direction) {
  return direction === "desc" ? "desc" : "asc";
}

function isColumnRef_(value) {
  return (typeof value === "string" && value.length > 0) || (Number.isInteger(value) && value > 0);
}

function isSortableColumnIndex_(value) {
  return Number.isInteger(value) && value > 0;
}

function isSheetStructurePlan_(plan) {
  return Boolean(
    plan &&
    typeof plan.targetSheet === "string" &&
    SHEET_STRUCTURE_OPERATIONS_.has(plan.operation)
  );
}

function isRangeSortPlan_(plan) {
  return Boolean(
    plan &&
    typeof plan.targetSheet === "string" &&
    typeof plan.targetRange === "string" &&
    Array.isArray(plan.keys) &&
    plan.keys.length > 0
  );
}

function isRangeFilterPlan_(plan) {
  return Boolean(
    plan &&
    typeof plan.targetSheet === "string" &&
    typeof plan.targetRange === "string" &&
    Array.isArray(plan.conditions) &&
    plan.conditions.length > 0
  );
}

function buildSortSpec_(plan) {
  return plan.keys
    .filter(function(key) {
      return isSortableColumnIndex_(key && key.columnRef);
    })
    .map(function(key) {
      return {
        dimensionIndex: key.columnRef - 1,
        sortOrder: key.direction === "desc" ? "DESCENDING" : "ASCENDING"
      };
    });
}

function getSheetStructureStatusSummary_(plan) {
  const rowLabel = ROW_OPERATION_LABELS_[plan && plan.operation];
  if (rowLabel) {
    return rowLabel + " " + formatCount_(plan.count, "row") + " at " + plan.targetSheet + " row " + (plan.startIndex + 1) + ".";
  }

  const columnLabel = COLUMN_OPERATION_LABELS_[plan && plan.operation];
  if (columnLabel) {
    return columnLabel + " " + formatCount_(plan.count, "column") + " at " + plan.targetSheet + " column " + (plan.startIndex + 1) + ".";
  }

  switch (plan && plan.operation) {
    case "merge_cells":
      return "Merged cells in " + plan.targetSheet + "!" + plan.targetRange + ".";
    case "unmerge_cells":
      return "Unmerged cells in " + plan.targetSheet + "!" + plan.targetRange + ".";
    case "freeze_panes":
      return "Froze panes on " + plan.targetSheet + " at " + plan.frozenRows + " row(s) and " + plan.frozenColumns + " column(s).";
    case "unfreeze_panes":
      return "Unfroze panes on " + plan.targetSheet + ".";
    case "autofit_rows":
      return "Auto-fit rows in " + plan.targetSheet + "!" + plan.targetRange + ".";
    case "autofit_columns":
      return "Auto-fit columns in " + plan.targetSheet + "!" + plan.targetRange + ".";
    case "set_sheet_tab_color":
      return "Set tab color for " + plan.targetSheet + " to " + plan.color + ".";
    default:
      return "Applied sheet structure update.";
  }
}

function getRangeSortStatusSummary_(plan) {
  const keySummary = Array.isArray(plan && plan.keys) && plan.keys.length > 0
    ? " by " + plan.keys
      .filter(function(key) {
        return isColumnRef_(key && key.columnRef);
      })
      .map(function(key) {
        return String(key.columnRef) + " " + formatSortDirection_(key.direction);
      })
      .join(", ")
    : "";

  return "Sorted " + plan.targetSheet + "!" + plan.targetRange + keySummary + ".";
}

function getRangeFilterStatusSummary_(plan) {
  return "Applied filter to " + plan.targetSheet + "!" + plan.targetRange;
}

if (typeof module !== "undefined") {
  module.exports = {
    isSheetStructurePlan_,
    isRangeSortPlan_,
    isRangeFilterPlan_,
    buildSortSpec_,
    getSheetStructureStatusSummary_,
    getRangeSortStatusSummary_,
    getRangeFilterStatusSummary_
  };
}
