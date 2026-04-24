# Wave 1 Design: Sheet Structure + Sort/Filter

Date: 2026-04-19

Status: Draft for user review

## Goal

Expand the spreadsheet assistant beyond current `sheet_update`, `sheet_import_plan`, `workbook_structure_update`, and `range_format_update` support by adding three new confirmed plan families:

- `sheet_structure_update`
- `range_sort_plan`
- `range_filter_plan`

This wave must fit the existing repo architecture:

- strict contract-first schemas in `packages/contracts`
- strict structured-body validation in the gateway
- typed preview rendering in `packages/shared-client`
- typed approval/writeback handling in `services/gateway`
- explicit host adapters in Excel and Google Sheets

No Hermes core changes are allowed.

## Why This Wave First

This wave gives a large user-facing capability increase while still fitting the current typed-plan pipeline.

It covers two major classes of spreadsheet work that are still missing:

- structural layout changes within sheets
- table organization actions such as sorting and filtering

It is also a better first expansion than jumping straight to cleanup, validation, pivots, or charts because:

- the preview model is still simple and inspectable
- the confirmation semantics are understandable
- the host APIs for Excel and Google Sheets are already close enough to support these actions without inventing a new orchestration model

## Scope

### In Scope

#### `sheet_structure_update`

Wave 1 supports the following operations:

- `insert_rows`
- `delete_rows`
- `hide_rows`
- `unhide_rows`
- `group_rows`
- `ungroup_rows`
- `insert_columns`
- `delete_columns`
- `hide_columns`
- `unhide_columns`
- `group_columns`
- `ungroup_columns`
- `merge_cells`
- `unmerge_cells`
- `freeze_panes`
- `unfreeze_panes`
- `autofit_rows`
- `autofit_columns`
- `set_sheet_tab_color`

#### `range_sort_plan`

Wave 1 supports:

- explicit target range sort
- inferred "current table" sort
- multi-key sort
- header-aware sort
- sort keys referenced by:
  - column letter
  - relative column index
  - header label

#### `range_filter_plan`

Wave 1 supports:

- explicit target range filter
- inferred "current table" filter
- active filter state applied directly to the target range
- replace-or-clear existing filter state on the same target
- basic operators:
  - `equals`
  - `notEquals`
  - `contains`
  - `startsWith`
  - `endsWith`
  - `greaterThan`
  - `greaterThanOrEqual`
  - `lessThan`
  - `lessThanOrEqual`
  - `isEmpty`
  - `isNotEmpty`
  - `topN`
- condition combiner:
  - `and`
  - `or`

### Out Of Scope

These stay out of wave 1:

- workbook-level sheet actions already covered by `workbook_structure_update`
- materializing filter results into a new range or sheet
- advanced filter groups with arbitrary nested boolean expressions
- filter-by-color / sort-by-color
- saved filter views
- locale-specific collation tuning
- protected ranges / protected sheets
- row or column reorder beyond sort
- conditional formatting
- data validation
- named ranges
- cleanup / reshape / transfer / pivot / chart features

## Existing Code Boundaries

Wave 1 must extend, not replace, the current boundaries:

- `packages/contracts/src/schemas.ts`
  - source of truth for request/response plan schemas
- `services/gateway/src/hermes/runtimeRules.ts`
  - what Hermes is allowed to emit
- `services/gateway/src/hermes/requestTemplate.ts`
  - prompt grounding and response preference hints
- `services/gateway/src/hermes/structuredBody.ts`
  - normalization and parsing of structured-body responses
- `services/gateway/src/routes/writeback.ts`
  - approval and completion gating
- `packages/shared-client/src/render.ts`
  - preview construction
- `apps/excel-addin/src/taskpane/taskpane.js`
  - Excel plan preview and apply path
- `apps/google-sheets-addon/src/Code.gs`
  - Google Sheets plan preview and apply path

Wave 1 should continue the current architecture style:

- one strict response type per plan family
- one strict preview branch per plan family
- one strict writeback result branch per plan family

## Chosen Approach

Use three new explicit typed plan families.

Rejected alternatives:

- a generic `sheet_operation_plan`
  - rejected because it would turn the contract into a loose bag of fields
- stuffing sort/filter into `sheet_update`
  - rejected because sort and filter are not matrix writes

The chosen model is:

- `sheet_structure_update`
- `range_sort_plan`
- `range_filter_plan`

This preserves validation clarity, preview clarity, and host adapter separation.

## User-Approved Behavioral Decisions

These choices were explicitly selected during brainstorming and are part of the spec:

- Wave 1 is `sheet_structure_update + range_sort_plan + range_filter_plan`
- Sort/filter support level is `B`
  - explicit range plus inferred current table
  - multi-key sort
  - basic filter operators
- Destructive or tricky actions use a stronger confirmation model
  - especially `delete_sheet` and risky moves in already-supported workbook actions
  - wave 1 extends the same concept to destructive row/column deletions
- "Current table" resolution is selection-first
  - if selection is a valid data rectangle, use selection
  - if selection is only a single cell or too small, infer current data region around the active cell
- Filter means applying filter state in place on the target range
  - not copying results elsewhere
- `sheet_structure_update` scope level is `B`
  - row/column basics plus layout essentials

## Contract Design

### Shared Envelope Metadata

Wave 1 extends the response union and writeback result union, but keeps the external Step 1 envelope shape unchanged.

All three new plan types must:

- remain confirmation-gated
- include `explanation`
- include `confidence`
- include `requiresConfirmation: true`
- support top-level warnings where needed

Where useful, they may also include:

- `overwriteRisk`
- `affectedRanges`
- `confirmationLevel`

`confirmationLevel` is new and should distinguish:

- `standard`
- `destructive`

This is used by the gateway approval path, not by the host directly.

### `sheet_structure_update`

Use a discriminated union keyed by `operation`.

Common fields:

- `targetSheet`
- `operation`
- `explanation`
- `confidence`
- `requiresConfirmation`
- `overwriteRisk?`
- `confirmationLevel`
- `affectedRanges?`

Operation-specific fields:

#### Row and column span operations

- `startIndex`
- `count`

Applies to:

- `insert_rows`
- `delete_rows`
- `hide_rows`
- `unhide_rows`
- `group_rows`
- `ungroup_rows`
- `insert_columns`
- `delete_columns`
- `hide_columns`
- `unhide_columns`
- `group_columns`
- `ungroup_columns`

Indices are zero-based contract values.

#### Range layout operations

- `targetRange`

Applies to:

- `merge_cells`
- `unmerge_cells`
- `autofit_rows`
- `autofit_columns`

#### Freeze operations

- `frozenRows?`
- `frozenColumns?`

Applies to:

- `freeze_panes`
- `unfreeze_panes`

For `unfreeze_panes`, both values should resolve to `0`.

#### Sheet visual operation

- `color`

Applies to:

- `set_sheet_tab_color`

### `range_sort_plan`

Fields:

- `targetSheet`
- `targetRange`
- `hasHeader`
- `keys`
- `explanation`
- `confidence`
- `requiresConfirmation`
- `affectedRanges?`

Each sort key contains:

- `columnRef`
- `direction`
- `sortOn?`

Where:

- `columnRef` may be:
  - column letter such as `C`
  - relative 1-based index such as `3`
  - header label such as `Status`
- `direction` is `asc` or `desc`
- `sortOn` is reserved for later host-specific extension and should stay optional in wave 1

### `range_filter_plan`

Fields:

- `targetSheet`
- `targetRange`
- `hasHeader`
- `conditions`
- `combiner`
- `clearExistingFilters`
- `explanation`
- `confidence`
- `requiresConfirmation`
- `affectedRanges?`

Each condition contains:

- `columnRef`
- `operator`
- `value?`
- `value2?`

`value2` is only used for two-boundary operators if introduced later. In wave 1 it can be present in schema but should not be emitted unless needed by a defined operator.

## Range And Table Resolution Semantics

### Explicit Range

If the user explicitly gives a target range, the plan must use that range unless it contradicts available context.

### Inferred Current Table

For prompts like:

- `sort this table by Status`
- `filter current table where Priority = High`

Resolve target range as follows:

1. If `context.selection.range` exists and `context.selection.values` describe a meaningful data rectangle, use the selection.
2. If selection is a single cell or too small to represent the intended table, infer the current data region around `context.activeCell`.

The model must not invent a larger target beyond grounded context.

### Header Semantics

`hasHeader` is explicit in both sort and filter plans.

If headers are present in selection context, Hermes should usually set `hasHeader=true`.

If target inference is ambiguous, the plan may still proceed, but it should include a warning instead of silently assuming a header row.

## Confirmation And Safety Model

### Standard Confirmation

All three new wave 1 plan types require normal confirmation before apply.

### Destructive Confirmation

The following wave 1 actions are destructive:

- `delete_rows`
- `delete_columns`

These must be marked:

- `confirmationLevel="destructive"`

The gateway must require a stronger second confirmation gate before issuing a final approval token for apply.

This should reuse the same safety philosophy already introduced for risky workbook operations.

### Risk Classification

Suggested classification:

- `insert_*`, `hide_*`, `unhide_*`, `group_*`, `ungroup_*`, `merge_cells`, `unmerge_cells`, `freeze_panes`, `unfreeze_panes`, `autofit_*`, `set_sheet_tab_color`
  - `confirmationLevel="standard"`
- `delete_rows`, `delete_columns`
  - `confirmationLevel="destructive"`
- `range_sort_plan`, `range_filter_plan`
  - `confirmationLevel="standard"`

### Fail-Closed Rule

If second confirmation state is required but missing, the gateway must reject approval rather than downgrade to standard confirmation.

## Runtime Rules And Request Template Changes

### Runtime Rules

`services/gateway/src/hermes/runtimeRules.ts` must explicitly teach Hermes:

- when to emit `sheet_structure_update`
- when to emit `range_sort_plan`
- when to emit `range_filter_plan`
- when to emit `error` with `UNSUPPORTED_OPERATION`

It must also define:

- target resolution rules
- header handling rules
- destructive confirmation expectations
- the difference between sort/filter plans and range-write plans

### Request Template

`services/gateway/src/hermes/requestTemplate.ts` must bias intent routing correctly for prompts like:

- `sort this table by due date descending`
- `filter current table where status contains open`
- `insert 3 rows above row 8`
- `merge A1:C1`
- `freeze the top row`

It must also pass the host capabilities that matter for wave 1.

## Gateway Validation And Writeback

### Structured Body Validation

`services/gateway/src/hermes/structuredBody.ts` must:

- accept the three new plan types
- normalize only what is necessary
- not silently reinterpret invalid payloads as another plan family

### Approval Path

`services/gateway/src/routes/writeback.ts` must:

- extend approval schema union to include the three new plan types
- extend completion result union with result types matching these families
- enforce digest match against stored Hermes response
- enforce second confirmation for destructive structure deletions

### Completion Results

Wave 1 should not overload everything into `range_write`.

Add explicit result kinds such as:

- `sheet_structure_update`
- `range_sort`
- `range_filter`

Each result should contain enough post-apply metadata for the host UI to display a precise status line.

## Preview And Rendering

### `sheet_structure_update`

Preview should be summary-first, not matrix-first.

Examples:

- `Insert 3 rows starting at row 8 on Sheet1`
- `Merge A1:C1 on Summary`
- `Freeze 1 row and 0 columns on Dashboard`

### `range_sort_plan`

Preview should show:

- target sheet and range
- whether a header row is assumed
- sort keys in order

Example:

- `Sort Sheet1!A1:F25 by Status asc, Due Date desc`

### `range_filter_plan`

Preview should show:

- target sheet and range
- whether a header row is assumed
- conditions and combiner
- whether existing filters will be cleared first

Example:

- `Filter Sheet1!A1:F25 where Status equals Open AND Priority equals High`

These plan types should not render as table previews unless a future wave introduces before/after preview simulation.

## Excel Host Design

Excel support belongs primarily in:

- `apps/excel-addin/src/taskpane/taskpane.js`
- helper modules similar to `writePlan.js`

Design requirements:

- classify the new plan types explicitly
- keep host-specific translation helpers out of the UI shell where possible
- apply each confirmed plan under one `Excel.run`
- use one final `context.sync()` per plan apply path where possible

Wave 1 host tasks:

- row and column insert/delete/hide/unhide/group/ungroup
- merge/unmerge
- freeze/unfreeze panes
- autofit rows/columns
- sheet tab color
- range sort
- in-place filter

Excel-specific caveat:

- sort and filter APIs may require table-or-range handling differences
- wave 1 should prefer working over generic worksheet ranges first, with capability-aware fallbacks where needed

## Google Sheets Host Design

Google Sheets support belongs primarily in:

- `apps/google-sheets-addon/src/Code.gs`
- related sidebar rendering glue

Design requirements:

- compile wave 1 plans into deterministic `batchUpdate` request lists where appropriate
- centralize index and range conversion helpers
- keep `sheetId` lookup and rename-safe behavior explicit

Wave 1 host tasks:

- row and column insert/delete/hide/unhide/group/ungroup
- merge/unmerge
- freeze/unfreeze panes
- autofit rows/columns
- sheet tab color
- basic sort specs
- basic filter criteria

Google Sheets-specific caveat:

- filter state should be treated as mutable sheet state, not as a copied data result

## Error Handling

Wave 1 should prefer typed errors over degraded fake success.

Examples:

- unsupported host capability
  - return or surface `UNSUPPORTED_OPERATION`
- invalid target resolution
  - return a contract-valid error or warning-backed refusal
- destructive apply without second confirmation
  - reject approval
- stale or mismatched plan digest
  - reject completion
- partial host apply ambiguity
  - fail closed rather than reporting success

## Testing Strategy

Wave 1 implementation must remain test-first.

### Contracts

Add schema tests for:

- valid and invalid `sheet_structure_update`
- valid and invalid `range_sort_plan`
- valid and invalid `range_filter_plan`
- destructive confirmation metadata
- invalid operator/field combinations

### Gateway

Add tests for:

- runtime rule acceptance and refusal paths
- request template routing hints
- structured-body parse/validation
- preview construction
- writeback approval for the new plan families
- writeback completion for the new result families
- second-confirm rejection path for destructive row/column delete plans

### Shared Client

Add render tests for:

- structure preview text
- sort preview text
- filter preview text

### Excel Host

Add helper and apply-path tests for:

- operation classification
- range/index conversion helpers
- sort key compilation
- filter compilation
- status summary lines

### Google Sheets Host

Add tests for:

- request compilation to `batchUpdate`
- sheet and range resolution helpers
- sort spec compilation
- filter criteria compilation

### Regression

Wave 1 test runs must also prove that these existing plan types still work:

- `sheet_update`
- `sheet_import_plan`
- `workbook_structure_update`
- `range_format_update`

## Debug Playbook

When wave 1 debugging is needed, use this order:

1. Reproduce the exact failing prompt and host context.
2. Capture the exact structured body or validation issue path.
3. Confirm the plan family chosen is the intended one.
4. Confirm preview output matches plan semantics.
5. Confirm approval gating, especially destructive confirmation state.
6. Confirm host compilation output before host execution.
7. Confirm completion result kind and status summary.

Do not debug sort or filter failures by hand-waving around “table intent”. Always inspect:

- target range
- header flag
- key/condition compilation
- host capability assumptions

## Implementation Order Inside Wave 1

Recommended implementation sequence:

1. Contracts for the three new plan types and their result types
2. Runtime rules and request-template routing
3. Structured-body validation and shared preview rendering
4. Gateway writeback approval/completion extensions
5. Excel host support
6. Google Sheets host support
7. Regression and end-to-end verification

This order keeps the repo usable after each layer and makes debugging easier.

## Non-Goals For This Spec

This spec does not define:

- wave 2 cleanup/transfer features
- wave 3 analysis/reporting features
- composite plans
- undo history
- dry-run mode
- materialized filtered outputs

Those belong to later specs and plans.
