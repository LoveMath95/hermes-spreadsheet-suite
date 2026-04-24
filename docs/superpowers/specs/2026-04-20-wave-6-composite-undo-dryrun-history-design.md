# Wave 6 Design: Composite Plans, Undo/Redo, Dry-Run, and Plan History

## Scope

Wave 6 adds a control plane on top of the existing typed spreadsheet plan families from Waves 1 through 5. The goal is not to invent new spreadsheet mutations. The goal is to orchestrate, simulate, reverse, and audit the mutations the codebase already knows how to execute.

This wave includes:

- `composite_plan`
- `undo_request`
- `redo_request`
- `dry_run_result`
- `plan_history_entry`
- `plan_history_page`

This wave does **not** include:

- nested composites
- implicit transactional rollback
- fuzzy simulation
- selective undo of arbitrary historical sub-steps
- cross-session durable history beyond the current workbook/session scope
- host-native history bridging

## Goals

Wave 6 should let the product handle these user intents exactly and safely:

- "Apply these three steps together."
- "Preview what this destructive plan will change before I confirm."
- "Undo the last confirmed cleanup."
- "Redo the cleanup I just undid."
- "Show me what Hermes changed in this workbook recently."

The design must preserve the same strictness used in earlier waves:

- typed contracts, not bag-of-fields payloads
- host-exact execution only
- fail closed when semantics cannot be represented exactly
- traceable request/run/execution lineage

## Architecture Boundary

Wave 6 adds four capability groups with separate responsibilities.

### 1. `composite_plan`

`composite_plan` is a confirmable execution plan that contains an ordered set of already-supported typed executable plans.

It is orchestration only. It does not define brand new spreadsheet operations.

Each step contains:

- `stepId`
- `dependsOn[]`
- `continueOnError`
- `plan`

`plan` must be one of the already-supported executable plan families:

- `sheet_update`
- `sheet_import_plan`
- `workbook_structure_update`
- `range_format_update`
- `conditional_format_plan`
- `sheet_structure_update`
- `range_sort_plan`
- `range_filter_plan`
- `data_validation_plan`
- `named_range_update`
- `range_transfer_plan`
- `data_cleanup_plan`
- `analysis_report_plan(materialize_report only)`
- `pivot_table_plan`
- `chart_plan`

`analysis_report_plan(chat_only)` is excluded because it is not confirmable write execution.

`composite_plan` cannot contain another `composite_plan` in Wave 6.

### 2. `undo_request` and `redo_request`

`undo_request` and `redo_request` are control-plane requests against the workbook/session execution history. They are not Hermes-generated mutation plans.

They target prior confirmed executions by `executionId`.

Only executions marked `reversible=true` and still exact-safe to reverse are eligible.

Undo and redo both create new execution records. They do not mutate the old record in place.

### 3. `dry_run_result`

`dry_run_result` represents a simulation of a confirmable plan or composite.

It is used for:

- explicit user requests like "preview" or "dry run"
- policy-driven gating for destructive or non-reversible composite flows

Dry-run is exact-safe only. If the gateway or host cannot simulate exact outcomes, the system must return an explicit unsupported result instead of a best-effort preview.

### 4. `plan_history`

`plan_history` is an execution ledger scoped to the current workbook/session.

It tracks:

- which plan ran
- whether it was approved, completed, failed, undone, or redone
- whether it is reversible
- whether undo or redo is still eligible
- lineage between the original execution and later undo/redo executions
- step-level execution status for composites

The history is not conversation-bound. It is workbook/session-bound, with `requestId` and `runId` preserved for traceability.

## Contract Design

### `composite_plan`

Top-level fields:

- `steps`
- `explanation`
- `confidence`
- `requiresConfirmation`
- `affectedRanges`
- `overwriteRisk`
- `confirmationLevel`
- `reversible`
- `dryRunRecommended`
- `dryRunRequired`

Rules:

- `requiresConfirmation` must be `true`
- `steps.length >= 1`
- every `stepId` must be unique
- every `dependsOn` target must refer to an existing step
- the dependency graph must be acyclic
- `reversible` is derived from the full set of steps
- if any step is destructive, `confirmationLevel` escalates to `destructive`
- if any step is non-reversible, whole-plan `reversible=false`
- if policy marks the plan as requiring dry-run, confirmation cannot proceed until a fresh compatible dry-run exists

Each step:

- `stepId: string`
- `dependsOn: string[]`
- `continueOnError: boolean`
- `plan: ExecutableWritePlan`

`ExecutableWritePlan` is the union of the already-supported executable plan types listed above, excluding `chat_only` analysis reports and excluding `composite_plan`.

### `undo_request`

Fields:

- `executionId`
- `requestId`
- `reason?`

Rules:

- must target a known history entry in the current workbook/session scope
- targeted execution must be `completed`
- targeted execution must be `reversible=true`
- targeted execution must still be `undoEligible=true`

### `redo_request`

Fields:

- `executionId`
- `requestId`
- `reason?`

Rules:

- must target an execution that represents a valid undo lineage point
- targeted execution must still be `redoEligible=true`
- stale state or incompatible workbook/session state must reject the request

### `dry_run_result`

Fields:

- `planDigest`
- `workbookSessionKey`
- `simulated`
- `steps?`
- `predictedAffectedRanges`
- `predictedSummaries`
- `overwriteRisk`
- `reversible`
- `expiresAt`
- `unsupportedReason?`

Rules:

- valid for a single plan or a composite plan
- usable for confirmation only while:
  - `planDigest` matches
  - `workbookSessionKey` matches
  - result has not expired
- `simulated=false` is valid only with an explicit unsupported reason

### `plan_history_entry`

Fields:

- `executionId`
- `requestId`
- `runId`
- `planType`
- `planDigest`
- `status`
- `timestamp`
- `reversible`
- `undoEligible`
- `redoEligible`
- `summary`
- `stepEntries?`
- `linkedExecutionId?`

`status` values:

- `approved`
- `completed`
- `failed`
- `undone`
- `redone`

For composites, `stepEntries` includes:

- `stepId`
- `planType`
- `status`
  - `completed`
  - `failed`
  - `skipped`
- `summary`
- `linkedExecutionId?` if the step becomes part of later undo lineage

### `plan_history_page`

Fields:

- `entries`
- `nextCursor?`

Wave 6 only needs a simple page contract. Rich searching/filtering is out of scope.

## Safety Semantics

### Composite execution

Failure handling is per-step:

- a step failure either stops the composite or allows continuation depending on that step’s `continueOnError`
- any step whose dependency failed becomes `skipped`
- no implicit rollback occurs

This is deliberate. Transactional rollback across heterogeneous spreadsheet operations is not exact-safe enough for Wave 6.

### Confirmation model

Composite confirmation uses one top-level confirmation action for the full plan, but the preview must clearly highlight:

- destructive steps
- non-reversible steps
- `continueOnError` steps
- dependency-based skip behavior

If any step is destructive, the entire composite escalates to destructive confirmation.

### Dry-run policy

Dry-run can be triggered in two ways:

- explicit user request
- policy-driven requirement before confirmation

Policy-driven dry-run is intended for composites with destructive or non-reversible characteristics where the product wants an exact-safe simulation before approval.

### Undo/redo safety

Undo and redo fail closed when:

- the target execution is not reversible
- the workbook/session no longer matches the assumptions of the stored inverse
- the inverse would require best-effort behavior
- the lineage is stale or superseded

Undo/redo is allowed only for a reversible subset. Wave 6 does not promise reversibility for every write family.

### Reversible subset

Wave 6 marks plans reversible only when an exact inverse or sufficient snapshot/preimage exists.

Included when exact-safe:

- `sheet_update`
- `range_format_update`
- `conditional_format_plan`
- `data_validation_plan`
- `named_range_update`
- `sheet_structure_update` for operations with exact inverse semantics
- `range_transfer_plan` when source/target preimage is captured exactly
- `data_cleanup_plan` when preimage is captured exactly
- `analysis_report_plan(materialize_report)` when the written target area preimage is captured exactly

Excluded until exact-safe inverse exists:

- `pivot_table_plan`
- `chart_plan`
- any operation whose inverse would require heuristic reconstruction
- any composite containing non-reversible steps

### Scope boundary

Undo/redo/history is scoped to the current workbook/session, not the current chat thread.

This allows continuity across prompts within the same live workbook context while avoiding the consistency problems of cross-session persistence.

## Data Flow

### Forward execution

1. Hermes returns either a normal plan or a `composite_plan`
2. Gateway validates the contract strictly
3. Gateway computes digest, reversibility, destructive status, and dry-run gating
4. Shared client renders preview
5. User confirms if required
6. Gateway records history state
7. Host executes steps or single plan
8. Gateway records completion/failure with lineage metadata

### Dry-run flow

1. Gateway receives explicit or policy-triggered dry-run request
2. Gateway validates current plan digest and workbook/session context
3. Host/gateway simulation helpers compute exact-safe predicted outcomes
4. Shared client renders `dry_run_result`
5. If confirmation gating depends on dry-run, the later approval path checks freshness and digest/session match

### Undo flow

1. User requests undo for an eligible `executionId`
2. Gateway resolves execution history
3. Gateway verifies reversibility and stale-state rules
4. Gateway builds inverse execution plan(s)
5. Host applies inverse exactly
6. Gateway records new history entry with `linkedExecutionId`

### Redo flow

1. User requests redo for an eligible lineage point
2. Gateway verifies redo eligibility
3. Gateway rebuilds the forward execution from stored exact-safe data
4. Host reapplies it
5. Gateway records a new redone execution entry

## Rendering and UX

### Composite preview

The shared preview must show:

- total step count
- step order
- per-step summary
- per-step flags:
  - destructive
  - reversible / non-reversible
  - continue on error
  - skipped if dependency fails
- whole-plan flags:
  - destructive confirmation required
  - dry-run recommended
  - dry-run required

Wave 6 does not render nested trees because nesting is forbidden.

### Dry-run preview

The UI must show:

- whether the simulation is exact-safe and usable
- predicted affected ranges
- predicted summary lines
- per-step predictions for composites
- explicit unsupported reason when simulation cannot be trusted

### Plan history UI

The history view should show:

- recent executions for the current workbook/session
- status
- summary
- timestamp
- undo eligibility
- redo eligibility
- lineage links
- step-level status for composites

### Undo/redo UX

Undo and redo should be explicit actions against history items, not inferred silently from arbitrary chat phrasing.

The UI should make it clear when:

- an item is reversible
- an item is no longer undoable
- an item has been undone
- an item can be redone

## Gateway Responsibilities

Wave 6 adds significant gateway ownership:

- validate `composite_plan`
- topologically order composite steps
- enforce no nesting
- derive destructive and reversible flags
- store dry-run artifacts with digest/session binding and expiry
- store execution history entries
- store step-level composite execution outcomes
- enforce undo/redo eligibility
- build inverse execution requests for reversible subset
- reject stale or non-exact-safe control actions

Undo/redo/history is intentionally gateway-owned, not Hermes-owned. Hermes remains responsible for proposing plans, not for adjudicating historical execution state.

## Host Responsibilities

Excel and Google Sheets hosts both need:

- forward execution reuse through existing typed executors
- exact-safe dry-run simulation helpers for supported plan families
- inverse execution helpers for the reversible subset
- explicit fail-closed behavior when exact reverse or simulation is unavailable

The hosts must not infer reversibility on their own. Reversibility should be computed from explicit capability rules and snapshot availability.

## Testing Strategy

### 1. Contract tests

Add schema tests for:

- valid and invalid `composite_plan`
- duplicate step ids
- bad dependencies
- cycles
- nested composite rejection
- `undo_request`
- `redo_request`
- `dry_run_result`
- `plan_history_entry`
- `plan_history_page`

### 2. Gateway tests

Add tests for:

- composite topological execution order
- `continueOnError` behavior
- dependency-failed -> `skipped`
- destructive confirmation escalation
- dry-run required gating
- dry-run digest/session binding
- dry-run expiry handling
- history persistence
- undo lineage
- redo lineage
- stale undo rejection
- stale redo rejection
- non-reversible execution rejection

### 3. Shared client tests

Add tests for:

- composite preview rendering
- destructive/non-reversible highlighting
- dry-run rendering
- history rendering
- step-level status rendering

### 4. Host adapter tests

Add tests for exact-safe supported cases:

- dry-run simulation of supported single-plan families
- dry-run simulation of supported composites
- inverse execution for reversible subset
- explicit failure for unsupported reverse/simulation

These should be added separately for:

- Excel host
- Google Sheets host

### 5. Regression

All Waves 1 through 5 must remain green:

- contracts
- shared client
- runtime rules
- request template
- hermes client normalization
- writeback flow
- Excel host waves 1 through 5
- Google Sheets host waves 1 through 5
- gateway build

## Rollout Order

Wave 6 should be implemented in this order:

1. contracts and shared-client types
2. gateway history and dry-run state model
3. composite preview and validation
4. single-plan dry-run support for exact-safe families
5. composite execution flow
6. reversible subset + undo/redo
7. history UI and regression hardening

This order keeps the control-plane state model stable before adding inversion logic.

## Risks

### Risk: hidden transactional expectations

Users may assume composite means all-or-nothing. Wave 6 does not promise that.

Mitigation:

- preview must explicitly say per-step failure semantics
- composite result must clearly show completed/failed/skipped steps

### Risk: stale undo

Workbook state may drift after an execution, making exact inverse invalid.

Mitigation:

- bind undo/redo eligibility to workbook/session state assumptions
- fail closed on mismatch

### Risk: fake dry-run confidence

A best-effort simulation would look trustworthy while being wrong.

Mitigation:

- simulate only exact-safe families
- return unsupported otherwise

### Risk: history becoming an audit dump instead of an execution ledger

Wave 6 only needs execution-oriented history, not a full observability product.

Mitigation:

- keep the history contract narrow
- postpone deep search/export/filter features

## Out of Scope

Explicitly out of scope for Wave 6:

- nested composites
- conditional branches or loops inside composites
- transactional rollback
- selective undo of one step inside an old composite
- cross-session persistent undo
- host-native history merge
- pivot/chart reversibility
- fuzzy dry-run previews
- long-term audit retention/export
