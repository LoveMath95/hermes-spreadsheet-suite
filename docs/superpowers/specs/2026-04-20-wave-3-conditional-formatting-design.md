# Wave 3 Design: Conditional Formatting

Date: 2026-04-20

Status: Approved design draft for implementation planning

## Scope

Wave 3 adds one new typed plan family:

- `conditional_format_plan`

This wave includes:

- single-color highlight rules
- text contains rules
- number comparison rules
- date comparison rules
- duplicate-values rules
- custom-formula rules
- top/bottom N rules
- above/below-average rules
- 2-color and 3-color scales where both hosts can represent the semantics exactly
- conditional-format rule management:
  - `add`
  - `replace_all_on_target`
  - `clear_on_target`

This wave does not include:

- data bars
- icon sets
- host-specific best-effort fallbacks
- conditional-format rule priority reordering
- stop-if-true semantics
- editing a specific existing conditional-format rule by id
- merging conditional formatting into `range_format_update`

## Architecture Boundary

Wave 3 extends the existing typed-plan architecture rather than replacing it.

The end-to-end boundary remains:

- `packages/contracts/src/schemas.ts`
  - source of truth for `conditional_format_plan` and its typed result schema
- `services/gateway/src/hermes/runtimeRules.ts`
  - explicit response-type guidance for Hermes
- `services/gateway/src/hermes/requestTemplate.ts`
  - prompt routing and contract-grounding hints
- `services/gateway/src/hermes/structuredBody.ts`
  - normalization and validation of structured responses
- `services/gateway/src/lib/hermesClient.ts`
  - typed envelope assembly and contract safety checks
- `services/gateway/src/routes/writeback.ts`
  - approval and completion gating for the new plan family
- `packages/shared-client/src/render.ts`
  - typed preview generation
- `packages/shared-client/src/types.ts`
  - typed preview and writeback result unions
- `packages/shared-client/src/trace.ts`
  - typed status and trace rendering support
- `apps/excel-addin/src/taskpane/taskpane.js`
  - Excel preview and apply paths
- `apps/excel-addin/src/taskpane/writePlan.js`
  - Excel write-plan classification and execution helpers
- `apps/google-sheets-addon/src/Code.gs`
  - Google Sheets apply path
- `apps/google-sheets-addon/html/Sidebar.js.html`
  - Google Sheets client preview and confirmation UI

Wave 3 keeps the current design rules:

- one strict response type per plan family
- one strict preview branch per plan family
- one strict writeback result branch per plan family
- no generic formatting bag-of-fields plan
- no best-effort host downgrade when semantics do not map exactly

## Chosen Plan Family

### `conditional_format_plan`

Purpose:
- add, replace, or clear conditional formatting on a target range with explicit confirmation

Wave 3 support level: `B`

Supported rule families:
- `single_color`
- `text_contains`
- `number_compare`
- `date_compare`
- `duplicate_values`
- `custom_formula`
- `top_n`
- `average_compare`
- `color_scale`

Supported management modes:
- `add`
- `replace_all_on_target`
- `clear_on_target`

Supported style payload:
- `backgroundColor`
- `textColor`
- `bold`
- `italic`
- `underline`
- `strikethrough`
- `numberFormat`

Supported target inference:
- use `selectedRange` when it is already a valid data rectangle
- if selection is one cell or too small, infer the current data region around the active cell

Host mismatch policy:
- fail closed
- do not generate an executable plan if Excel and Google Sheets cannot both represent the requested semantics exactly for the current host

## Contract Design

### Shared Metadata

`conditional_format_plan` must:

- include `targetSheet`
- include `targetRange`
- include `managementMode`
- include `ruleType`
- include `explanation`
- include `confidence`
- include `requiresConfirmation: true`
- include `affectedRanges`
- include `replacesExistingRules`

Wave 3 does not introduce a generic plan envelope. `conditional_format_plan` remains a distinct discriminated type.

### `conditional_format_plan`

Common fields:
- `targetSheet`
- `targetRange`
- `managementMode`
  - `add`
  - `replace_all_on_target`
  - `clear_on_target`
- `ruleType`
- `explanation`
- `confidence`
- `requiresConfirmation: true`
- `affectedRanges`
- `replacesExistingRules`

Rule variants:

1. `single_color`
- `comparator`
- `value?`
- `value2?`
- `style`

2. `text_contains`
- `text`
- `style`

3. `number_compare`
- `comparator`
- `value`
- `value2?`
- `style`

4. `date_compare`
- `comparator`
- `value`
- `value2?`
- `style`

5. `duplicate_values`
- `style`

6. `custom_formula`
- `formula`
- `style`

7. `top_n`
- `rank`
- `direction`
  - `top`
  - `bottom`
- `style`

8. `average_compare`
- `direction`
  - `above`
  - `below`
- `style`

9. `color_scale`
- `points[]`
- `points.length` must be `2` or `3`

Comparators are explicit:
- `between`
- `not_between`
- `equal_to`
- `not_equal_to`
- `greater_than`
- `greater_than_or_equal_to`
- `less_than`
- `less_than_or_equal_to`

Color-scale point types are explicit:
- `min`
- `max`
- `number`
- `percent`
- `percentile`

### Style Payload

Static-style variants support:

- `backgroundColor?`
- `textColor?`
- `bold?`
- `italic?`
- `underline?`
- `strikethrough?`
- `numberFormat?`

Color-scale variants support:

- `points[]`
- each point includes:
  - `type`
  - `value?`
  - `color`

Style payload invariants:
- `color_scale` must not carry static style fields
- non-scale rule variants must not carry `points[]`
- `clear_on_target` must not carry any rule-specific payload or style payload

### Management Invariants

- `add`
  - requires a fully-specified rule payload
- `replace_all_on_target`
  - requires a fully-specified rule payload
  - implies all existing conditional-format rules on the target range will be removed and replaced with the new rule
- `clear_on_target`
  - requires only target metadata
  - must not include any rule payload

## Safety Semantics

All wave 3 plans are confirmation-gated.

### Rule Replacement Safety

Preview must make replacement behavior explicit:

- `add` keeps existing rules on the target
- `replace_all_on_target` replaces existing rules on the target
- `clear_on_target` removes existing rules on the target

`replace_all_on_target` and `clear_on_target` are not destructive in the same class as deleting a sheet, but they do remove existing formatting rules. The preview must say that plainly.

### Host Mapping Safety

If a host cannot represent a requested rule exactly:

- fail closed
- return or surface `UNSUPPORTED_OPERATION`
- never silently weaken the condition
- never silently weaken the style payload
- never silently convert a supported rule family into a visually similar but semantically different rule

### Unsupported Scope Safety

If the prompt implies a capability not included in wave 3:

- Hermes must return `type="error"`
- the error code must be `UNSUPPORTED_OPERATION`
- the system must not emit a fake executable confirmation flow

## Preview Model

`conditional_format_plan` preview must render:

- target sheet and range
- management mode
- exact rule summary
- exact style summary or color-scale summary
- whether existing rules on target will be replaced or cleared

Examples:

- `Add conditional formatting on Sheet1!B2:B100 when value is greater than 10.`
- `Replace all conditional formatting on Summary!A2:D20 with a 3-color scale.`
- `Clear conditional formatting on Sheet2!A:A.`

Preview must be future-tense and must not imply execution already happened.

## Apply Path

### Gateway

Gateway responsibilities:

- strict schema validation
- typed preview metadata
- standard approval/writeback flow
- typed completion result:
  - `conditional_format_update`

### Excel Host

Excel responsibilities:

- map supported rule families into Office.js conditional-format APIs
- apply `add`, `replace_all_on_target`, and `clear_on_target` strictly on the target range
- fail closed when a rule or style combination cannot be represented exactly

Excel wave 3 must cover:

- single-color rules
- text contains rules
- number/date comparisons
- duplicate values
- custom formula
- top/bottom N
- above/below average
- clear and replace behaviors

### Google Sheets Host

Google Sheets responsibilities:

- compile supported rule families into deterministic conditional-format requests
- apply `add`, `replace_all_on_target`, and `clear_on_target` strictly on the target range
- fail closed when a rule or style combination cannot be represented exactly

Google Sheets wave 3 must cover:

- single-color rules
- text contains rules
- number/date comparisons
- duplicate values
- custom formula
- top/bottom N
- above/below average
- supported 2-color and 3-color scales
- clear and replace behaviors

### Host Result Model

Completion results must not reuse static-format writeback results. Wave 3 needs a distinct typed completion result:

- `conditional_format_update`

## Request Routing And Prompt Grounding

`runtimeRules.ts` and `requestTemplate.ts` must explicitly teach Hermes:

- when to choose `conditional_format_plan`
- that conditional formatting is distinct from `range_format_update`
- that unsupported conditional-format asks must return `error`
- that `clear_on_target` contains no rule payload
- that `replace_all_on_target` removes existing target rules before applying the new rule
- that host-exact semantics matter and unsupported mappings must fail closed

Prompt grounding should prefer `conditional_format_plan` for asks like:

- `highlight overdue dates`
- `color values above 10 in red`
- `mark duplicates in column B`
- `apply a 3-color scale to this table`
- `clear conditional formatting from A:A`
- `replace current conditional formatting on this table with a rule that highlights values below 0 in red`

## Testing Strategy

### 1. Contract Tests

Add schema pass/fail coverage for:

- each rule family
- each management mode
- comparator invariants
- color-scale invariants
- style payload invariants
- `clear_on_target` carrying forbidden rule fields

### 2. Gateway, Runtime, And Render Tests

Add or extend tests for:

- `runtimeRules.ts`
- `requestTemplate.ts`
- `structuredBody.ts`
- `hermesClient.ts`
- `writeback.ts`
- shared preview rendering

These tests must verify:

- Hermes guidance mentions `conditional_format_plan`
- typed envelope assembly works
- unsupported asks become typed errors rather than fake confirmations
- preview summaries are explicit and non-lossy
- `conditional_format_update` is recognized as a typed completion result

### 3. Excel Host Tests

Add mocked apply-path coverage for:

- single color
- text contains
- number compare
- date compare
- duplicate values
- custom formula
- top/bottom N
- above/below average
- `add`
- `replace_all_on_target`
- `clear_on_target`
- fail-closed unsupported mappings

### 4. Google Sheets Host Tests

Add mocked apply-path coverage for:

- single color
- text contains
- number compare
- date compare
- duplicate values
- custom formula
- top/bottom N
- above/below average
- supported color scales
- `add`
- `replace_all_on_target`
- `clear_on_target`
- fail-closed unsupported mappings

### 5. Regression

Wave 3 must not break:

- static `range_format_update`
- wave 1 structure/sort/filter plans
- wave 2 validation/named-range plans
- existing chat, formula, sheet update, import, and reviewer-safe flows

## Debug Strategy

Implementation and debugging must follow the same repo rule as earlier waves:

- do not guess
- reproduce with focused tests first
- inspect exact typed preview or exact apply payload
- fix the narrow failing branch
- rerun focused tests
- rerun regression before claiming completion

Wave 3 debugging should pay special attention to:

- host parity mismatches
- hidden semantic downgrades
- preview saying one thing while apply does another
- `clear_on_target` accidentally touching rules outside the target
