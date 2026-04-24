# Google Sheets Live Demo Reliability Design

Date: 2026-04-21

Scope:
- Google Sheets bound Apps Script sidebar on the provided demo workbook
- remote Hermes request/response flow through the existing gateway
- read/chat flows
- confirm-before-write write-back flows
- gap closure required for live demo reliability

Status:
- Design approved in terminal before writing
- Ready for implementation planning after spec review

## Goal

Resume the Google Sheets branch of Hermes Spreadsheet Suite and make it reliable enough for a live demo on the provided workbook:

- target workbook: the provided Google Sheets demo file
- host: Google Sheets sidebar with the `Hermes` menu
- runtime path: `Google Sheets -> Apps Script sidebar -> gateway -> remote Hermes Agent -> preview -> explicit confirm -> Apps Script write-back`

The success bar is not “the sidebar opens.” The success bar is:

- the bound script on the demo workbook is known to match local source
- read/chat works against the live workbook context
- every supported write flow previews first and writes only after explicit confirmation
- proof/status metadata remains visible and correct
- unsupported semantics fail closed instead of pretending success

## Chosen Approach

Chosen approach: audit and patch the existing implementation, then redeploy the Google Sheets host from local source.

Included:
- treat the local repo as the source of truth
- review the current Google Sheets host and gateway paths end to end
- patch gaps that block the agreed demo matrix
- redeploy into the bound Apps Script project attached to the demo workbook
- seed dedicated demo tabs inside the workbook
- verify each live flow against the real workbook

Rejected alternatives:
- rewriting the Google Sheets host from scratch
- rebuilding the entire stack from scratch

Reason:
- the repo already contains a substantial Google Sheets implementation in `apps/google-sheets-addon/src/Code.gs` and `apps/google-sheets-addon/html/Sidebar.js.html`
- the gateway already contains approval, completion, dry-run, and history surfaces
- the highest-risk problem is drift and unsupported paths, not missing foundations

## Architecture Boundary

This design preserves the existing repo boundary:

- Hermes core remains untouched
- the gateway remains a validator, forwarder, and write-back controller
- the Google Sheets host remains a thin client plus exact-safe apply layer
- the remote Hermes Agent remains the reasoning/orchestration brain

This work is specifically about the Google Sheets deployment path:

1. local source review and patching
2. bound Apps Script redeploy to the provided workbook
3. gateway/runtime configuration alignment
4. live workbook verification

No local spreadsheet reasoning is added to the gateway.

## Source Of Truth And Deployment Model

The local repository is the source of truth for the live demo.

Rules:

- do not trust the currently bound Apps Script project just because the `Hermes` menu exists
- assume possible drift between the bound script and local repo until proven otherwise
- redeploy the bound Apps Script project from local source after patching
- set script properties explicitly for the demo workbook

Required Google Sheets runtime properties:

- `HERMES_GATEWAY_URL`
- `HERMES_CLIENT_VERSION`
- optionally `HERMES_REVIEWER_SAFE_MODE`
- optionally `HERMES_FORCE_EXTRACTION_MODE`

The live demo should only begin after:

- the bound Apps Script project matches the patched local source
- the script properties point to the intended gateway reachable on the shared VPN/network
- the gateway points to the intended remote Hermes Agent deployment

## Demo Matrix

The live demo must cover both read/chat and write-back flows on the provided workbook.

### Read/Chat flows

Required:

- explain current selection
- summarize active sheet or selected region
- formula advice and formula explanation
- attachment analysis for supported image inputs

These flows must not mutate the workbook.

### Write-back flows

Required for the demo:

- `sheet_update`
  - values
  - formulas
  - notes
- `sheet_import_plan`
- `workbook_structure_update`
  - create, delete, rename, duplicate, move, hide, unhide sheet
- `sheet_structure_update`
  - insert/delete/hide/unhide/group/ungroup rows and columns
  - merge/unmerge
  - freeze/unfreeze
  - autofit
  - set sheet tab color
- `range_sort_plan`
- `range_filter_plan`
- `range_format_update`
- `data_validation_plan`
- `named_range_update`
- `range_transfer_plan`
- `data_cleanup_plan`
- `analysis_report_plan`
  - `chat_only` for non-write
  - `materialize_report` for write-back
- `pivot_table_plan`
- `chart_plan`
- `composite_plan`
  - only when each child step is itself supported and exact-safe

### Control-plane status

Wave 6 control plane is not a required live-demo blocker for this rollout.

Specifically:

- dry-run support may be used when useful for composite previews
- history may remain visible if already wired
- undo/redo are not required for the initial reliable demo script

Reason:
- the current gateway ledger still throws `not implemented` for undo/redo
- this design focuses on reliable read/chat and confirm-before-write flows first

## Known Gaps In Current Local Code

From current local source review:

- Google Sheets `pivot_table_plan` write-back is explicitly blocked
- Google Sheets `chart_plan` write-back is explicitly blocked
- gateway undo/redo remain unimplemented

Current behavior that must change before claiming the agreed demo matrix:

- `apps/google-sheets-addon/src/Code.gs` must stop throwing unsupported errors for exact-safe pivot creation
- `apps/google-sheets-addon/src/Code.gs` must stop throwing unsupported errors for exact-safe chart creation
- `apps/google-sheets-addon/html/Sidebar.js.html` preview/support messaging must match the real host support after patching
- tests must be updated so “supported in demo” and “unsupported/fail closed” lines are honest

## Interaction Rules

### Confirmation

Every write flow in scope remains confirm-before-write.

Rules:

- the host may render a preview immediately after Hermes responds
- no write occurs before explicit user confirmation
- destructive plans require the additional destructive confirmation path when the contract marks them destructive
- the host sends approval to the gateway before applying the write locally
- the host reports completion back to the gateway after local apply succeeds

### Fail-closed behavior

If a requested operation cannot be represented exactly and safely in Google Sheets:

- do not degrade to a close-enough mutation
- do not label the action as successful
- return a clear unsupported/error path

### Composite plans

Composite plans are allowed only when every step maps to supported exact-safe child plans.

If any step is unsupported:

- fail closed before write
- do not partially claim full workflow support in the demo matrix

## Demo Workbook Structure

The provided workbook will be treated as disposable demo data.

The rollout should create dedicated demo tabs to avoid mixing verification and showcase data with any pre-existing content.

Recommended workbook layout:

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
- optionally `Demo_ImageImport`

Each tab should contain purpose-built seed data that makes the target flow obvious and easy to verify live.

## Acceptance Criteria

The rollout is successful only if all of the following are true on the real demo workbook.

### Host/runtime acceptance

- the `Hermes` menu opens the sidebar
- the sidebar can reach the configured gateway
- the gateway can reach the configured remote Hermes Agent
- the sidebar renders a single `Thinking...` placeholder before the final response

### Read/chat acceptance

- selection explain works with live workbook context
- sheet summarize works with live workbook context
- formula explain/help works with live workbook context
- proof line shows:
  - `requestId`
  - `hermesRunId`
  - `service`
  - `environment`
  - `duration`

### Write-back acceptance

For every supported write flow in this spec:

- Hermes returns a previewable response
- the sidebar shows preview before mutation
- no mutation happens before confirmation
- confirm triggers gateway approval first
- Apps Script applies the approved plan locally
- gateway completion is reported after apply
- the user sees a success status line that matches the real mutation

### Safety acceptance

- unsupported exact-safe gaps fail closed
- destructive flows require destructive confirmation
- no hidden auto-apply path exists
- the bound script on the workbook matches the patched local source used for verification

## Verification Plan

Verification proceeds in this order.

### 1. Static and local verification

- review Google Sheets host source
- review gateway request/writeback paths relevant to Google Sheets
- run syntax checks for `Code.gs` and `Sidebar.js.html`
- run targeted tests covering Google Sheets flows and patched support gaps

### 2. Deployment verification

- redeploy the patched local Apps Script code into the workbook’s bound project
- set the required Apps Script properties for the live gateway
- confirm the gateway environment and remote Hermes endpoint are reachable from the shared network

### 3. Workbook seeding

- create the dedicated demo tabs
- insert deterministic sample data for each flow
- ensure destructive demos operate only on disposable demo tabs

### 4. Live smoke verification

Run live checks for:

- read/chat
- direct sheet updates
- image import preview and confirm
- workbook and sheet structure changes
- sort/filter/format
- validation and named ranges
- transfer and cleanup
- materialized analysis report
- pivot creation
- chart creation
- composite workflow over supported steps

### 5. Demo runbook finalization

Prepare a concise operator script listing:

- which tab to use for each flow
- which prompt to type
- what preview should appear
- what final mutation/result should be visible after confirmation

## Risks And Decisions

### Risk: bound script drift

Mitigation:
- always redeploy from local source before final verification

### Risk: support claims exceed host reality

Mitigation:
- verify each write family against real Google Sheets behavior
- keep the demo matrix honest
- fail closed when exact-safe parity cannot be achieved

### Risk: pivot/chart exact-safe behavior is trickier than current host assumptions

Mitigation:
- implement only the exact-safe subset needed for the demo
- avoid broad “full Google Sheets parity” claims

### Risk: undo/redo increases scope without improving demo reliability enough

Decision:
- defer undo/redo from the required live-demo bar for this rollout

## Out Of Scope

This design does not include:

- Hermes core changes
- a full rebuild of the spreadsheet suite
- Excel-side completion as a blocker for Google Sheets demo readiness
- durable production deployment workflows beyond the current demo environment
- requiring undo/redo before the initial reliable Google Sheets demo can ship

## Implementation Handoff

The implementation plan that follows this spec should focus on:

1. auditing the exact Google Sheets support matrix in local code
2. patching pivot and chart support for the exact-safe subset needed in demo
3. aligning sidebar preview/support messaging with actual host capability
4. validating gateway approval/completion behavior against the patched host
5. redeploying to the bound Apps Script project on the provided workbook
6. seeding demo tabs and executing live verification

There are no `TODO` or `TBD` placeholders in this design. The only intentionally deferred area is undo/redo, which is explicitly excluded from the required live-demo bar.
