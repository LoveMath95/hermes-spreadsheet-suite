# Google Sheets Live Demo Checklist

Use the disposable workbook only. The Google Sheets live-demo deploy path is documented in `docs/demo-runbook.md`.

## Demo tabs

- `Demo_ReadChat`
- `Demo_SheetUpdate`
- `Demo_Structure`
- `Demo_SortFilterFormat`
- `Demo_ValidationNamedRanges`
- `Demo_TransferCleanup`
- `Demo_Reports`
- `Demo_Pivot`
- `Demo_Charts`
- `Demo_Composite`
- `Demo_ImageImport`

## Read / chat

- Tab: `Demo_ReadChat`
- Prompt: `Explain the current selection.`
- Expected outcome: the assistant returns a read-only explanation, shows `Thinking...` before the answer, shows remote proof/status metadata, and performs no write-back.

## Write-back checklist

- Tab: `Demo_SheetUpdate`
- Prompt: `Suggest a formula that calculates total revenue in G2.`
- Expected outcome: the assistant returns formula guidance as read-only assistance, does not require confirmation, and does not write back to the sheet.

- Tab: `Demo_Structure`
- Prompt: `Create a new summary sheet for this data and move the totals into it.`
- Expected outcome: the assistant proposes a structure change preview, shows the target sheet/range clearly, and applies the sheet-structure write only after confirmation.

- Tab: `Demo_SortFilterFormat`
- Prompt: `Sort this table by Revenue descending and then filter Status = Closed Won.`
- Expected outcome: the assistant previews the sort/filter/format operations, keeps the change confirmable, and writes back only the requested table transformation after approval.

- Tab: `Demo_ValidationNamedRanges`
- Prompt: `Add a dropdown on D2:D20 for Open, Blocked, Done.`
- Expected outcome: the assistant previews the validation/named-range change, clearly identifies the target range, and applies the validation write only after confirmation.

- Tab: `Demo_TransferCleanup`
- Prompt: `Trim whitespace in A2:C20.`
- Expected outcome: the assistant previews the cleanup/write-back, keeps the plan confirmable, and applies only the cleanup mutation after approval.

- Tab: `Demo_Reports`
- Prompt: `Create an analysis report for this table on Demo_Reports starting at A1.`
- Expected outcome: the assistant returns a report preview, shows the final target range, and creates the report sheet content only after explicit confirmation.

- Tab: `Demo_Pivot`
- Prompt: `Create a pivot table from this data on Demo_Pivot starting at A1 grouped by Region with Revenue summed.`
- Expected outcome: the assistant returns a pivot preview, confirms the exact target anchor, and creates the pivot table only after approval.

- Tab: `Demo_Charts`
- Prompt: `Create a column chart on Demo_Charts at A1 using Month as category and Revenue as the series.`
- Expected outcome: the assistant returns a chart preview, confirms the exact target anchor, and creates the chart only after approval.

- Tab: `Demo_Composite`
- Prompt: `Create a pivot on Demo_Pivot and then create a chart on Demo_Charts.`
- Expected outcome: the assistant shows a composite preview with the child pivot/chart steps in order, keeps the workflow confirmable, and applies the write-back sequence only after approval.

- Tab: `Demo_ImageImport`
- Prompt: `Extract this table and put it into Demo_ImageImport starting at B4.`
- Expected outcome: the assistant returns an image-import preview first, shows the final target range, and applies the extraction write-back only after confirmation.

## Preflight

- Seed and populate every `Demo_*` tab with disposable sample data before running any prompts.
- Confirm the workbook contains realistic sample rows on the disposable tabs so the prompts and previews have actual source data.
- Do not skip this step; the live demo assumes the `Demo_*` tabs are already prepared.

## Operator notes

- Demo and review flows must stay on the disposable workbook.
- The live subset must keep preview-before-write behavior for every write-back category.
- The rollout path and target tabs are verified from the local repo source of truth before the demo begins.
