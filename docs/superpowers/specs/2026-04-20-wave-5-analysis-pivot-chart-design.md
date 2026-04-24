# Wave 5 Design: Analysis Reports, Pivot Tables, and Charts

Date: 2026-04-20

Scope:
- `analysis_report_plan`
- `pivot_table_plan`
- `chart_plan`

Status:
- Design approved in terminal before writing
- Ready for implementation planning after spec review

## Goal

Extend the spreadsheet assistant from direct edits and formatting into higher-value analytical artifacts:
- structured analysis reports
- pivot tables
- charts

This wave stays inside current repo boundaries:
- strict typed contracts
- gateway validation and writeback control
- shared preview/render surfaces
- Excel host adapter
- Google Sheets host adapter

No Hermes core changes are assumed.

## Chosen Scope

### `analysis_report_plan`

Chosen level: `B`

Included:
- summary stats
- simple trends
- top/bottom values
- anomalies/outliers
- grouped breakdowns
- cited source ranges in the report
- suggested next actions/questions

Output modes:
- `chat_only`
- `materialize_report`

### `pivot_table_plan`

Chosen level: `B`

Included:
- multiple row groups
- optional column groups
- multiple value aggregations
- optional filters
- optional sort by grouped field or aggregated value
- explicit source range
- explicit target sheet + target anchor

Excluded in this wave:
- calculated fields
- slicers
- host-specific advanced pivot features beyond exact-safe parity

### `chart_plan`

Chosen level: `B`

Included chart types:
- `bar`
- `column`
- `stacked_bar`
- `stacked_column`
- `line`
- `area`
- `pie`
- `scatter`

Included options:
- explicit category mapping
- explicit series mapping
- target sheet + anchor
- basic title options
- basic legend options

Excluded in this wave:
- combo charts
- secondary axis
- custom color packs
- annotations
- trendlines

## User-Approved Interaction Rules

### Source inference

When the user says things like:
- `make a pivot of this data`
- `chart this table`
- `analyze this sheet`

and does not specify a source range:

1. If the current selection is a valid data rectangle, use it.
2. If the selection is too small or only one cell, infer the current data region around the active cell.

This is the same inference rule used in earlier waves.

### Default placement

When the user does not specify a target location:
- reports default to a new report sheet
- pivots default to a new pivot sheet
- charts default to a new chart/artifact sheet, or the nearest exact-safe equivalent the host can represent

No default placement onto the current worksheet beside the selection.

### Confirmation semantics

Standard confirmation:
- creating a materialized report
- creating a pivot
- creating a chart

Destructive second confirmation:
- replacing an existing artifact area
- clearing an existing target area
- overwriting a target sheet/range with existing content

### Host mismatch policy

If Excel and Google Sheets cannot represent the requested semantics exactly:
- fail closed
- return `UNSUPPORTED_OPERATION`
- do not degrade to a “close enough” artifact

## Architecture Boundary

Wave 5 adds three new plan families:

1. `analysis_report_plan`
2. `pivot_table_plan`
3. `chart_plan`

These remain separate typed families. They are not merged into:
- a generic `analysis_artifact_plan`
- `sheet_update`
- `range_format_update`
- any other existing plan type

Reason:
- report, pivot, and chart artifacts have materially different semantics
- they need distinct preview and host-apply logic
- strict unions are easier to validate, test, and fail closed

The boundary remains:
- contracts define plan schemas
- Hermes runtime rules emit only supported plan types or `error`
- gateway validates and gates writeback
- shared client renders typed previews
- hosts apply typed plans with exact-safe semantics

## Contract Design

## `analysis_report_plan`

### Common fields

- `sourceSheet`
- `sourceRange`
- `outputMode`
  - `chat_only`
  - `materialize_report`
- `targetSheet?`
- `targetRange?`
- `sections[]`
- `explanation`
- `confidence`
- `requiresConfirmation`
- `affectedRanges`
- `overwriteRisk`
- `confirmationLevel`
  - `standard`
  - `destructive`

### Section types

Allowed section types in this wave:
- `summary_stats`
- `trends`
- `top_bottom`
- `anomalies`
- `group_breakdown`
- `next_actions`

Each section includes:
- `type`
- `title`
- `summary`
- `sourceRanges[]`

### Output mode semantics

#### `chat_only`

- `requiresConfirmation=false`
- no target sheet required
- no writeback flow
- no host apply path
- response is still typed as `analysis_report_plan`, but it is non-write

#### `materialize_report`

- `requiresConfirmation=true`
- `targetSheet` required
- `targetRange` may be a true range or an anchor
- host materializes a structured report block/table into the target area

If target content would be replaced:
- `confirmationLevel="destructive"`

## `pivot_table_plan`

### Common fields

- `sourceSheet`
- `sourceRange`
- `targetSheet`
- `targetRange`
- `rowGroups[]`
- `columnGroups[]?`
- `valueAggregations[]`
- `filters[]?`
- `sort?`
- `explanation`
- `confidence`
- `requiresConfirmation=true`
- `affectedRanges`
- `overwriteRisk`
- `confirmationLevel`
  - `standard`
  - `destructive`

### Grouping and aggregation

`rowGroups[]`
- one or more field refs

`columnGroups[]`
- zero or more field refs

`valueAggregations[]`
- `field`
- `aggregation`
  - `sum`
  - `count`
  - `average`
  - `min`
  - `max`

### Filters

Optional filters:
- `field`
- `operator`
- `value?`
- `value2?`

Only exact-safe operators already expressible across hosts should be allowed.

### Sort

Optional sort supports:
- sorting by grouped field
- sorting by aggregated value
- direction:
  - `asc`
  - `desc`

### Safety

If pivot creation would replace an existing target artifact area:
- `confirmationLevel="destructive"`

Otherwise:
- `confirmationLevel="standard"`

## `chart_plan`

### Common fields

- `sourceSheet`
- `sourceRange`
- `targetSheet`
- `targetRange`
- `chartType`
- `categoryField?`
- `series[]`
- `title?`
- `legendPosition?`
- `explanation`
- `confidence`
- `requiresConfirmation=true`
- `affectedRanges`
- `overwriteRisk`
- `confirmationLevel`
  - `standard`
  - `destructive`

### Chart types

Allowed in this wave:
- `bar`
- `column`
- `stacked_bar`
- `stacked_column`
- `line`
- `area`
- `pie`
- `scatter`

### Series mapping

`series[]` includes:
- `field` or equivalent range-backed reference
- `label?`

`categoryField?`
- explicit category field for category-based charts

### Presentation options

`title?`
- optional chart title string

`legendPosition?`
- `top`
- `bottom`
- `left`
- `right`
- `hidden`

### Safety

If target chart area/sheet would be replaced or cleared:
- `confirmationLevel="destructive"`

Otherwise:
- `confirmationLevel="standard"`

## Global Safety Rules

These rules apply across all three plan families:

1. If host semantics are not exact-safe, fail closed.
2. Unsupported requests must return `error/UNSUPPORTED_OPERATION`.
3. No best-effort downgrade is allowed.
4. Default placement goes to a new artifact sheet when target is omitted.
5. Existing content replacement triggers destructive second confirmation.

## Preview Model

## `analysis_report_plan`

### `chat_only`

Preview behavior:
- render sections directly in assistant content
- no confirm UI
- no writeback affordance

### `materialize_report`

Preview must show:
- source sheet/range
- output target sheet/range
- section list
- whether a new artifact sheet will be created
- destructive overwrite note if applicable

## `pivot_table_plan`

Preview must show:
- source sheet/range
- target sheet/range
- row groups
- column groups
- value aggregations
- filters
- sort
- destructive overwrite note if applicable

## `chart_plan`

Preview must show:
- source sheet/range
- target sheet/range
- chart type
- category mapping
- series mapping
- title
- legend position
- destructive overwrite note if applicable

These previews should be typed summaries, not fake screenshots or approximate tables.

## Apply Path

## Gateway

Responsibilities:
- strict schema validation
- typed preview metadata
- approval/writeback gating
- destructive second confirmation gating

Special case:
- `analysis_report_plan` with `outputMode="chat_only"` never enters writeback

Writeback-enabled artifact flows:
- `analysis_report_plan` with `outputMode="materialize_report"`
- `pivot_table_plan`
- `chart_plan`

Typed completion results to add:
- `analysis_report_update`
- `pivot_table_update`
- `chart_update`

## Excel host

### `analysis_report_plan(materialize_report)`

- materialize a structured report block/table into target area
- exact-safe only

### `pivot_table_plan`

- map to Office.js pivot APIs only if exact semantics are supported

### `chart_plan`

- map to Office.js chart APIs only if exact semantics and placement are supported

If any requested semantics are not exact-safe:
- throw
- fail closed

## Google Sheets host

### `analysis_report_plan(materialize_report)`

- materialize a structured report block/table into target area

### `pivot_table_plan`

- compile deterministic pivot creation operations if exact-safe

### `chart_plan`

- compile deterministic chart creation operations if exact-safe

If any requested semantics are not exact-safe:
- throw
- fail closed

## Testing Strategy

## 1. Contract tests

Add schema tests for:
- `analysis_report_plan`
- `pivot_table_plan`
- `chart_plan`

Include:
- valid/invalid `chat_only` vs `materialize_report`
- target requirements
- aggregation invariants
- series/category invariants
- destructive confirmation metadata

## 2. Gateway/runtime/render tests

Cover:
- runtime rules mention all three new plan families
- request template guides these artifacts correctly
- hermes client accepts valid typed bodies and rejects invalid ones
- shared preview is explicit and non-lossy
- `chat_only` analysis stays out of writeback
- materialized report / pivot / chart flows enter writeback correctly

## 3. Host adapter tests

### Excel

Add tests for:
- materialized report creation
- pivot creation
- chart creation
- destructive overwrite gating
- fail-closed unsupported mappings

### Google Sheets

Add tests for:
- materialized report creation
- pivot creation
- chart creation
- destructive overwrite gating
- fail-closed unsupported mappings

## 4. Regression

Wave 5 must not break:
- Wave 1
- Wave 2
- Wave 3
- Wave 4
- existing import/update/format flows

## Recommended Execution Order

1. Contracts and shared types
2. Shared preview/render support
3. Gateway runtime / request template / structured body / client handling
4. Writeback support and typed completion result handling
5. Excel host apply path
6. Google Sheets host apply path
7. Full regression and whole-wave review

## Non-Goals For This Wave

Explicitly out of scope:
- calculated pivot fields
- slicers
- combo charts
- trendlines
- secondary axis
- scenario analysis
- forecasting heuristics
- fuzzy analytical inference
- best-effort host degradation

## Spec Self-Review

Checks completed:
- no `TODO` / `TBD` placeholders
- architecture matches selected scope
- safety rules are consistent with Waves 1–4
- scope is focused enough for one implementation plan
- ambiguous host fallback behavior has been resolved explicitly as fail-closed
