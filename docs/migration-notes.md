# Migration Notes

This repo started as a scaffold with looser request/response shapes and lighter demo assumptions. Batches 1–3 aligned the implementation to the finalized Step 1 and Step 2 contracts without touching Hermes core.

## 1. Step 1 / Step 2 contract alignment

Before:

- scaffold-specific request shapes
- scaffold-specific response shapes
- local proof objects and local message wrappers

After:

- hosts build the exact Step 2 backend request envelope:
  - `schemaVersion`
  - `requestId`
  - `source`
  - `host`
  - `userMessage`
  - `conversation`
  - `context`
  - `capabilities`
  - `reviewer`
  - `confirmation`
- gateway validates Step 2 on ingress
- gateway validates Step 1 on egress
- hosts render Step 1 response envelopes directly

## 2. `targetRange` semantics

Before:

- some host write paths treated `targetRange` like an anchor cell

After:

- `targetRange` is the full final destination rectangle
- write-back checks the full range dimensions against `shape.rows` and `shape.columns`
- preview rendering shows the full final rectangle semantics

Examples:

- `F12` means a 1x1 rectangle
- `A1:C4` means a 4x3 rectangle

## 3. `sheet_import_plan` headers vs values

Before:

- header handling was mixed into preview/write logic

After:

- `headers` and `values` are treated separately
- `values` contains data rows only
- preview renders `headers` above `values`
- the final write matrix is `[headers, ...values]`
- `shape.rows` includes the header row
- `shape.columns` equals `headers.length`

## 4. `sheet_update` semantics

Before:

- shape/write calculations were not strictly tied to the full final rectangle

After:

- `shape` describes the full final write rectangle
- no implicit header semantics exist unless the backend puts headers inside `values`
- the hosts write the exact proposed matrices only after confirmation

## 5. Extraction mode semantics

Contract-facing semantics:

- `real`
- `demo`
- `unavailable`

After the hardening pass:

- gateway and hosts preserve `real`, `demo`, and `unavailable` in contract-facing responses
- demo output must be explicitly labeled with warnings
- reviewer-safe unavailable mode must not fabricate extracted content

Implementation note:

- the example screenshot sidecar still uses `IMAGE_EXTRACTION_MODE=disabled` as its local env switch for the unavailable/error path
- that is a sidecar-local runtime switch, not the contract-facing response value

## 6. Reviewer-safe no-fabrication behavior

Before:

- screenshot extraction had a silent demo fallback risk

After:

- reviewer-safe mode must not present fake extracted content as real
- forced unavailable mode must not surface fake `extracted_table`
- forced unavailable mode must not surface fake `sheet_import_plan`
- hosts render the unavailable/error path without a preview or confirm button

## 7. Public proof fields only

Before:

- proof/status handling depended on scaffold-local fields

After:

- visible proof fields are limited to contract-safe metadata:
  - `requestId`
  - `hermesRunId`
  - `serviceLabel`
  - `environmentLabel`
  - `durationMs`
  - public `trace`
  - `skillsUsed`
  - `downstreamProvider`
  - warnings
  - confidence
  - confirmation-required state

## 8. No chain-of-thought exposure

Before:

- the scaffold was less explicit about proof/privacy boundaries

After:

- no chain-of-thought is rendered
- no internal prompts are rendered
- no secrets or raw private logs are rendered
- no raw stack traces are rendered in the main host UI

## 9. Write-back confirmation flow

Before:

- proposal/preview/write behavior was less strictly tied to the contract

After:

- Hermes returns proposals only
- hosts preview the proposal first
- approval goes through the gateway
- write-back occurs only after explicit confirmation
- request/run/approval token flow is preserved end-to-end

## 10. Host behavior summary

Excel Office.js:

- builds Step 2 request envelopes
- renders Step 1 response envelopes
- writes only after approval

Google Sheets Apps Script:

- builds Step 2 request envelopes
- renders Step 1 response envelopes
- writes only after approval

Shared client layer:

- owns the contract-aligned request helpers
- owns proof/trace formatting
- owns preview semantics for response types
