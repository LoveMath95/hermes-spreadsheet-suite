# Wave 4 Design: Range Transfer And Data Cleanup

Date: 2026-04-20

Status: Approved design draft for implementation planning

## Scope

Wave 4 adds two new typed plan families:

- `range_transfer_plan`
- `data_cleanup_plan`

This wave includes:

- range copy between ranges and sheets
- range move between ranges and sheets
- append into a target range/table
- transpose during transfer
- paste modes:
  - `values`
  - `formulas`
  - `formats`
- data cleanup operations:
  - `trim_whitespace`
  - `remove_blank_rows`
  - `remove_duplicate_rows`
  - `normalize_case`
  - `split_column`
  - `join_columns`
  - `fill_down`
  - `standardize_format`

This wave does not include:

- fuzzy cleanup
- heuristic type inference
- locale-heavy parsing beyond exact-safe text normalization
- formula-reference rewrite semantics beyond exact-safe transfer
- clipboard emulation
- cross-host best-effort downgrade behavior

## Architecture Boundary

Wave 4 extends the existing typed-plan architecture rather than replacing it.

The end-to-end boundary remains:

- `packages/contracts/src/schemas.ts`
  - source of truth for the new plan schemas and typed result schemas
- `services/gateway/src/hermes/runtimeRules.ts`
  - explicit response-type guidance for Hermes
- `services/gateway/src/hermes/requestTemplate.ts`
  - prompt routing and contract-grounding hints
- `services/gateway/src/hermes/structuredBody.ts`
  - normalization and validation of structured responses
- `services/gateway/src/lib/hermesClient.ts`
  - typed envelope assembly and contract safety checks
- `services/gateway/src/routes/writeback.ts`
  - approval and completion gating for the new plan families
- `services/gateway/src/lib/traceBus.ts`
  - persisted typed completion state
- `packages/shared-client/src/render.ts`
  - typed preview generation
- `packages/shared-client/src/types.ts`
  - typed preview and writeback result unions
- `packages/shared-client/src/trace.ts`
  - typed status and trace rendering support
- `apps/excel-addin/src/taskpane/taskpane.js`
  - Excel preview and apply paths
- `apps/excel-addin/src/taskpane/writePlan.js`
  - Excel write-plan classification and status helpers
- `apps/google-sheets-addon/src/Code.gs`
  - Google Sheets apply path
- `apps/google-sheets-addon/html/Sidebar.js.html`
  - Google Sheets client preview and confirmation UI

Wave 4 keeps the current design rules:

- one strict response type per plan family
- one strict preview branch per plan family
- one strict writeback result branch per plan family
- no generic bag-of-fields data-operation plan
- no best-effort host downgrade when semantics do not map exactly

## Chosen Plan Families

### `range_transfer_plan`

Purpose:
- copy, move, append, or transpose a source range into a target range with explicit confirmation

Wave 4 support level: `B`

Supported operations:
- `copy`
- `move`
- `append`

Supported transfer features:
- `pasteMode`
  - `values`
  - `formulas`
  - `formats`
- `transpose`

Target inference rules:
- if the selection is already a valid data rectangle, use it
- if the selection is too small, infer the current data region around the active cell
- if the user names only the target sheet and does not name a target cell, default the target start to `A1`

Safety rules:
- overlap or destructive ambiguity must fail closed
- `move` and overwrite-target cases require destructive confirmation

### `data_cleanup_plan`

Purpose:
- clean or reshape a target range/table with explicit confirmation

Wave 4 support level: `B`

Supported operations:
- `trim_whitespace`
- `remove_blank_rows`
- `remove_duplicate_rows`
- `normalize_case`
- `split_column`
- `join_columns`
- `fill_down`
- `standardize_format`

Supported operation-specific features:
- `normalize_case.mode`
  - `upper`
  - `lower`
  - `title`
- `split_column`
  - source column
  - delimiter
  - target start column
- `join_columns`
  - source columns
  - delimiter
  - target column
- `fill_down`
  - optional target columns subset
- `standardize_format`
  - `date_text`
  - `number_text`
  - exact-safe target pattern only
- `remove_duplicate_rows`
  - optional key columns
- `remove_blank_rows`
  - optional key columns

Safety rules:
- row-removal and overwrite-style cleanup operations require destructive confirmation
- fuzzy or heuristic cleanup is out of scope and must fail closed

## Contract Design

### Shared Metadata

Both plan families must:

- include `explanation`
- include `confidence`
- include `requiresConfirmation: true`
- include `affectedRanges`
- include `overwriteRisk`
- include `confirmationLevel`
  - `standard`
  - `destructive`

Wave 4 does not introduce a generic transfer/cleanup envelope. These remain distinct discriminated types.

### `range_transfer_plan`

Common fields:
- `sourceSheet`
- `sourceRange`
- `targetSheet`
- `targetRange`
- `operation`
  - `copy`
  - `move`
  - `append`
- `pasteMode`
  - `values`
  - `formulas`
  - `formats`
- `transpose`
- `explanation`
- `confidence`
- `requiresConfirmation: true`
- `affectedRanges`
- `overwriteRisk`
- `confirmationLevel`

Semantics:
- `copy`
  - source remains unchanged
- `move`
  - source is cleared only after the target write succeeds
- `append`
  - `targetRange` must resolve to the append anchor or first insertion cell
- `transpose`
  - transpose is applied before final target-shape validation

Transfer invariants:
- if only the target sheet is named by the user, the planner resolves `targetRange` from `A1`
- if source and target overlap in a way that is not exact-safe:
  - fail closed
- if `move` would overwrite target data:
  - `confirmationLevel` must be `destructive`
- if `append` would require guessing a target position beyond approved rules:
  - fail closed

### `data_cleanup_plan`

Common fields:
- `targetSheet`
- `targetRange`
- `operation`
  - `trim_whitespace`
  - `remove_blank_rows`
  - `remove_duplicate_rows`
  - `normalize_case`
  - `split_column`
  - `join_columns`
  - `fill_down`
  - `standardize_format`
- `explanation`
- `confidence`
- `requiresConfirmation: true`
- `affectedRanges`
- `overwriteRisk`
- `confirmationLevel`

Operation-specific payload:

1. `normalize_case`
- `mode`
  - `upper`
  - `lower`
  - `title`

2. `split_column`
- `sourceColumn`
- `delimiter`
- `targetStartColumn`

3. `join_columns`
- `sourceColumns[]`
- `delimiter`
- `targetColumn`

4. `fill_down`
- `columns[]?`

5. `standardize_format`
- `formatType`
  - `date_text`
  - `number_text`
- `formatPattern`

6. `remove_duplicate_rows`
- `keyColumns[]?`
  - default is full-row comparison

7. `remove_blank_rows`
- `keyColumns[]?`
  - default is full-row blankness

Cleanup invariants:
- `remove_blank_rows` and `remove_duplicate_rows` must use `confirmationLevel: "destructive"`
- `split_column` and `join_columns` must use `confirmationLevel: "destructive"` when target columns may be overwritten
- `fill_down` must not invent values; it can only propagate existing exact source values downward
- `standardize_format` is only valid when parsing and rewriting are exact-safe for the given format pattern

## Safety Semantics

All wave 4 plans are confirmation-gated.

### Destructive Confirmation

The gateway must require a second explicit destructive confirmation for:

- `range_transfer_plan.operation = "move"`
- any transfer plan with overwrite risk on the target
- `remove_blank_rows`
- `remove_duplicate_rows`
- `split_column` when target columns may overwrite data
- `join_columns` when target column may overwrite data

All other wave 4 operations use `confirmationLevel: "standard"`.

### Host Mapping Safety

If a host cannot represent a requested transfer or cleanup operation exactly:

- fail closed
- return or surface `UNSUPPORTED_OPERATION`
- never silently weaken the operation
- never silently skip destructive parts of the operation
- never silently choose a different target anchor

### Overlap Safety

If transfer source and target overlap in a way that is not exact-safe:

- fail closed
- do not attempt best-effort copy or move

### Cleanup Safety

Wave 4 must not perform:

- fuzzy deduplication
- heuristic date parsing
- heuristic number parsing
- locale-sensitive cleanup unless the semantics are exact and deterministic

Unsupported cleanup requests must return `UNSUPPORTED_OPERATION`.

## Preview Model

### `range_transfer_plan`

Preview must render:

- source sheet and range
- target sheet and range
- operation
- paste mode
- transpose on or off
- destructive note when source will be cleared or target may be overwritten

Examples:

- `Copy Sheet1!A1:D20 to Sheet2!A1 using values.`
- `Move Summary!B2:F10 to Archive!A1 and clear the source after success.`
- `Append transposed values from Sheet1!A2:A10 to Sheet2!A1.`

### `data_cleanup_plan`

Preview must render:

- target sheet and range
- cleanup operation
- operation-specific parameters
- destructive note when rows may be removed or target columns may be overwritten

Examples:

- `Remove duplicate rows in Sheet1!A2:F100 using key columns A and C.`
- `Split column B on "," into columns C:E.`
- `Fill down empty cells in columns D:F on Sheet2!A1:F200.`

Preview must be future-tense and must not imply execution already happened.

## Apply Path

### Gateway

Gateway responsibilities:

- strict schema validation
- typed preview metadata
- standard approval/writeback flow
- second confirmation enforcement for destructive plans
- typed completion results:
  - `range_transfer_update`
  - `data_cleanup_update`

### Excel Host

Excel responsibilities:

- read source range for transfer operations
- apply transpose before final write when requested
- write to target deterministically
- clear source only after successful target write for `move`
- perform cleanup transforms in memory when semantics are exact-safe
- write back deterministically
- fail closed on overlap ambiguity or unsupported cleanup semantics

### Google Sheets Host

Google Sheets responsibilities:

- preserve the same semantics as Excel for transfer and cleanup
- use deterministic in-memory transforms plus range writes or exact-safe sheet operations
- clear source only after successful target write for `move`
- fail closed on overlap ambiguity, destructive ambiguity, or unsupported cleanup semantics

### Host Result Model

Wave 4 needs distinct typed completion results:

- `range_transfer_update`
- `data_cleanup_update`

These must not be collapsed into generic `range_write` results.

## Request Routing And Prompt Grounding

`runtimeRules.ts` and `requestTemplate.ts` must explicitly teach Hermes:

- when to choose `range_transfer_plan`
- when to choose `data_cleanup_plan`
- that transfer and cleanup are distinct from `sheet_update`
- that destructive cleanup/transfer requires `confirmationLevel: "destructive"`
- that unsupported fuzzy or heuristic cleanup must return `error`
- that overlap ambiguity must fail closed
- that target-sheet-only transfer defaults to `A1`

Prompt grounding should prefer `range_transfer_plan` for asks like:

- `Copy this table to Sheet2`
- `Move A1:D20 to Archive!A1`
- `Append these values to the end of Sheet3`
- `Transpose this list into row 1 on Summary`

Prompt grounding should prefer `data_cleanup_plan` for asks like:

- `Trim whitespace in this table`
- `Remove duplicate rows from this range`
- `Split column B on commas into columns C:E`
- `Join columns A and B into column C with a dash`
- `Fill down missing values in column D`
- `Standardize these date strings to YYYY-MM-DD`

## Testing Strategy

### 1. Contract Tests

Add schema pass/fail coverage for:

- each transfer operation
- each cleanup operation
- operation-specific payload invariants
- destructive confirmation invariants
- overlap metadata invariants

### 2. Gateway, Runtime, And Render Tests

Add or extend tests for:

- `runtimeRules.ts`
- `requestTemplate.ts`
- `structuredBody.ts`
- `hermesClient.ts`
- `writeback.ts`
- shared preview rendering

These tests must verify:

- Hermes guidance mentions both new plan families
- unsupported cleanup/transfer asks become typed errors
- typed envelope assembly works
- destructive second confirmation applies where required
- previews are explicit and non-lossy
- `range_transfer_update` and `data_cleanup_update` are recognized as typed completion results

### 3. Excel Host Tests

Add coverage for:

- `copy`
- `move`
- `append`
- `transpose`
- overlap rejection
- `trim_whitespace`
- `remove_blank_rows`
- `remove_duplicate_rows`
- `normalize_case`
- `split_column`
- `join_columns`
- `fill_down`
- exact-safe `standardize_format`
- fail-closed unsupported semantics

### 4. Google Sheets Host Tests

Add coverage for the same categories as Excel:

- transfer operations
- cleanup operations
- overlap rejection
- destructive confirmation-sensitive flows
- fail-closed unsupported semantics

### 5. Regression

Wave 4 must not break:

- `sheet_update`
- `sheet_import_plan`
- `workbook_structure_update`
- `sheet_structure_update`
- `range_format_update`
- `conditional_format_plan`
- wave 1, wave 2, and wave 3 families
- existing chat, formula, import, and reviewer-safe flows

## Debug Strategy

Implementation and debugging must follow the same repo rule as earlier waves:

- do not guess
- reproduce with focused tests first
- inspect exact typed preview, exact target-range resolution, or exact host write result
- fix the narrow failing branch
- rerun focused tests
- rerun regression before claiming completion

Wave 4 debugging should pay special attention to:

- source/target overlap ambiguity
- destructive confirmation gating
- move semantics clearing source before target write succeeds
- preview saying one thing while apply does another
- cleanup operations silently rewriting more columns/rows than the preview claims

