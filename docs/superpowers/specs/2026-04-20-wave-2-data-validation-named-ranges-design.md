# Wave 2 Design: Data Validation And Named Ranges

Date: 2026-04-20

Status: Approved design draft for implementation planning

## Scope

Wave 2 adds two new typed plan families:

- `data_validation_plan`
- `named_range_update`

This wave does not include:

- protected ranges
- protected sheets
- generic metadata plans
- conditional formatting
- cleanup / reshape / transfer plans

## Architecture Boundary

Wave 2 extends the current typed-plan architecture rather than replacing it.

The end-to-end boundary remains:

- `packages/contracts/src/schemas.ts`
  - source of truth for the new plan schemas and result schemas
- `services/gateway/src/hermes/runtimeRules.ts`
  - explicit response-type guidance for Hermes
- `services/gateway/src/hermes/requestTemplate.ts`
  - prompt routing and contract-grounding hints
- `services/gateway/src/hermes/structuredBody.ts`
  - normalization and validation of structured responses
- `services/gateway/src/routes/writeback.ts`
  - approval and completion gating for the new plan families
- `packages/shared-client/src/render.ts`
  - typed preview generation
- `packages/shared-client/src/types.ts`
  - typed preview and writeback result unions
- `apps/excel-addin/src/taskpane/taskpane.js`
  - Excel preview and apply paths
- `apps/google-sheets-addon/src/Code.gs`
  - Google Sheets preview and apply paths
- `apps/google-sheets-addon/html/Sidebar.js.html`
  - Google Sheets client preview and confirmation UI

Wave 2 keeps the current design rules:

- one strict response type per plan family
- one strict preview branch per plan family
- one strict writeback result branch per plan family
- no generic bag-of-fields operation plan

## Chosen Plan Families

### `data_validation_plan`

Purpose:
- apply validation rules to a target range with explicit confirmation

Wave 2 support level: `B`

Supported rule families:
- dropdown list
- checkbox
- whole number validation
- decimal validation
- date validation
- text length validation
- custom formula validation

Supported rule features:
- allow blank
- invalid-data behavior:
  - `warn`
  - `reject`
- help/input text
- literal list values
- source from another range
- source from a named range

### `named_range_update`

Purpose:
- create, rename, delete, or retarget named ranges with explicit confirmation

Wave 2 support level: `B`

Supported operations:
- `create`
- `rename`
- `delete`
- `retarget`

Supported scopes:
- workbook-level names
- sheet-scoped names where the host supports them

## Contract Design

### Shared Metadata

Both plan families must:

- include `explanation`
- include `confidence`
- include `requiresConfirmation: true`
- support `affectedRanges` where useful
- fail closed when the host cannot represent the requested operation exactly

Wave 2 does not introduce a generic plan envelope. These remain distinct discriminated types.

### `data_validation_plan`

Common fields:
- `targetSheet`
- `targetRange`
- `ruleType`
- `explanation`
- `confidence`
- `requiresConfirmation: true`
- `allowBlank`
- `invalidDataBehavior`
  - `warn`
  - `reject`
- `helpText?`
- `affectedRanges?`
- `replacesExistingValidation?`

Rule variants:

1. `list`
- `values[]` or `sourceRange`
- `showDropdown?`

2. `checkbox`
- optional checked value
- optional unchecked value

3. `whole_number`
- `comparator`
- `value`
- `value2?`

4. `decimal`
- `comparator`
- `value`
- `value2?`

5. `date`
- `comparator`
- `value`
- `value2?`

6. `text_length`
- `comparator`
- `value`
- `value2?`

7. `custom_formula`
- `formula`

Comparators are explicit:
- `between`
- `not_between`
- `equal_to`
- `not_equal_to`
- `greater_than`
- `greater_than_or_equal_to`
- `less_than`
- `less_than_or_equal_to`

### `named_range_update`

Common fields:
- `operation`
  - `create`
  - `rename`
  - `delete`
  - `retarget`
- `name`
- `scope`
  - `workbook`
  - `sheet`
- `explanation`
- `confidence`
- `requiresConfirmation: true`
- `sheetName?`
- `targetSheet?`
- `targetRange?`
- `newName?`
- `affectedRanges?`
- `overwriteRisk?`

Operation invariants:
- `create` requires `targetSheet` and `targetRange`
- `rename` requires `newName`
- `delete` requires existing name identity only
- `retarget` requires `targetSheet` and `targetRange`
- sheet-scoped names require `sheetName`
- workbook-level names must omit `sheetName`

## Safety Semantics

All wave 2 plans are confirmation-gated.

### Validation Safety

Validation previews must make replacement behavior explicit:
- whether existing validation on the target range will be replaced

If a host cannot represent a requested validation exactly:
- fail closed
- return or surface `UNSUPPORTED_OPERATION`
- never silently weaken the rule

### Named Range Safety

Wave 2 keeps `named_range_update` confirmation level at standard.

Rationale:
- named ranges are metadata changes rather than direct cell-destructive writes
- stronger destructive gating can be reconsidered later for protected or formula-impact-aware features

If the requested name scope is unsupported by a host:
- fail explicitly
- do not silently coerce workbook scope to sheet scope or vice versa

## Preview Design

### `data_validation_plan`

Preview must show:
- target sheet and range
- rule type
- exact constraint summary
- allow blank state
- warn vs reject behavior
- help text when present
- whether existing validation is replaced

Example:
- `Validate Sheet1!B2:B100 as whole number between 1 and 10 • reject invalid • allow blank: no`

### `named_range_update`

Preview must show:
- operation
- name
- scope
- old target if relevant
- new target if relevant

Examples:
- `Rename workbook name SalesData to SalesData2026`
- `Retarget sheet-scoped name InputRange on Sheet1 to B2:D20`

These previews must remain non-lossy enough for confirmation decisions.

## Apply Path Design

### Gateway

Gateway responsibilities:
- validate strict schemas for both plan families
- build typed previews
- route approval and completion through normal writeback flow
- extend writeback result union with:
  - `data_validation_update`
  - `named_range_update`

### Excel Host

Excel must:
- translate each validation variant into Office.js validation APIs
- translate named range operations into workbook or worksheet named-item APIs
- fail closed for unsupported exact semantics

### Google Sheets Host

Google Sheets must:
- apply validation through range data-validation APIs
- apply named range operations through spreadsheet named-range APIs
- keep sheet-scope vs workbook-scope behavior explicit
- fail closed when host APIs cannot preserve exact requested semantics

## Error Handling

Wave 2 should prefer explicit typed failure over degraded success.

Examples:
- unsupported validation rule on the current host
  - surface `UNSUPPORTED_OPERATION`
- unsupported named range scope on the current host
  - surface `UNSUPPORTED_OPERATION`
- ambiguous retarget or missing target resolution
  - fail closed
- confirmation missing or stale writeback state
  - reject approval or completion

## Testing Strategy

### 1. Contract Tests

Add schema pass/fail coverage for:
- each validation rule variant
- comparator invariants
- list-source invariants
- named range operation invariants
- workbook vs sheet scope rules

### 2. Gateway / Runtime / Preview Tests

Add tests for:
- runtime rules mention both new response types
- request template routes relevant prompts correctly
- structured-body parsing for both new families
- hermes client final-envelope handling
- shared preview rendering is non-lossy
- writeback approval and completion support new result kinds

### 3. Host Adapter Tests

Excel mocked tests:
- each main validation family
- create / rename / delete / retarget named range
- unsupported semantics fail closed

Google mocked tests:
- each main validation family
- create / rename / delete / retarget named range
- scope handling remains explicit
- unsupported semantics fail closed

### 4. Regression Tests

Keep existing plan families green:
- `sheet_update`
- `sheet_import_plan`
- `workbook_structure_update`
- `range_format_update`
- wave 1 types

## Out Of Scope

Still not included in wave 2:
- protected ranges
- protected sheets
- conditional formatting
- cleanup / reshape / transfer
- chart and pivot plans
- formula audit
- composite plans

## Implementation Readiness

This scope is intentionally limited to two typed plan families that fit the current architecture well:
- `data_validation_plan`
- `named_range_update`

It is small enough for one implementation plan, but large enough to warrant phased execution inside that plan:
- contracts
- shared preview/types
- gateway/runtime/writeback
- Excel host
- Google Sheets host
- regression verification
