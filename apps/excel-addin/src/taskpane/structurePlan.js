const SHEET_STRUCTURE_OPERATIONS = new Set([
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

const ROW_OPERATION_LABELS = {
  insert_rows: "Inserted",
  delete_rows: "Deleted",
  hide_rows: "Hid",
  unhide_rows: "Unhid",
  group_rows: "Grouped",
  ungroup_rows: "Ungrouped"
};

const COLUMN_OPERATION_LABELS = {
  insert_columns: "Inserted",
  delete_columns: "Deleted",
  hide_columns: "Hid",
  unhide_columns: "Unhid",
  group_columns: "Grouped",
  ungroup_columns: "Ungrouped"
};

function formatCount(count, singular) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function isSheetStructurePlan(plan) {
  return Boolean(
    plan &&
    typeof plan.targetSheet === "string" &&
    SHEET_STRUCTURE_OPERATIONS.has(plan.operation)
  );
}

export function getSheetStructureStatusSummary(plan) {
  const rowLabel = ROW_OPERATION_LABELS[plan?.operation];
  if (rowLabel) {
    return `${rowLabel} ${formatCount(plan.count, "row")} at ${plan.targetSheet} row ${plan.startIndex + 1}.`;
  }

  const columnLabel = COLUMN_OPERATION_LABELS[plan?.operation];
  if (columnLabel) {
    return `${columnLabel} ${formatCount(plan.count, "column")} at ${plan.targetSheet} column ${plan.startIndex + 1}.`;
  }

  switch (plan?.operation) {
    case "merge_cells":
      return `Merged cells in ${plan.targetSheet}!${plan.targetRange}.`;
    case "unmerge_cells":
      return `Unmerged cells in ${plan.targetSheet}!${plan.targetRange}.`;
    case "freeze_panes":
      return `Froze panes on ${plan.targetSheet} at ${plan.frozenRows} row(s) and ${plan.frozenColumns} column(s).`;
    case "unfreeze_panes":
      return `Unfroze panes on ${plan.targetSheet}.`;
    case "autofit_rows":
      return `Auto-fit rows in ${plan.targetSheet}!${plan.targetRange}.`;
    case "autofit_columns":
      return `Auto-fit columns in ${plan.targetSheet}!${plan.targetRange}.`;
    case "set_sheet_tab_color":
      return `Set tab color for ${plan.targetSheet} to ${plan.color}.`;
    default:
      return "Applied sheet structure update.";
  }
}
