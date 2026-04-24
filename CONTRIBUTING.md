# Contributing to Hermes Spreadsheet Suite

This repo is the spreadsheet execution surface around **Hermes**.

Contributions should strengthen that product boundary, not blur it.

## First Principles

- Hermes is the central spreadsheet reasoning and planning brain.
- The hosts and gateway are execution and safety layers around Hermes.
- New behavior should land as a first-class capability when it is part of the product surface.
- Avoid one-off prompt patches when the change really needs a contract family, host preview path, or writeback verification rule.

## What Good Changes Look Like

A strong contribution usually does one or more of these:

- adds or hardens a contract-backed capability family
- closes a real host/gateway mismatch
- improves approval, completion, dry-run, undo, or execution safety
- fixes a false logic path that makes Hermes look weaker than it is
- expands regression coverage for an existing boundary

Weak changes usually look like:

- prompt-only steering with no product-level capability support
- host-only hacks that bypass the shared contract
- silent behavior changes without gateway verification updates
- writeback changes without exact completion checks

## Repo Areas

| Area | Path | Owns |
| --- | --- | --- |
| Contracts | `packages/contracts/` | schemas, request/response types, trace events |
| Shared client | `packages/shared-client/` | gateway client, shared request/render helpers |
| Gateway | `services/gateway/` | validation, normalization, forwarding, approvals, completion, execution control |
| Excel host | `apps/excel-addin/` | Office.js request capture, preview rendering, supported apply paths |
| Google Sheets host | `apps/google-sheets-addon/` | Apps Script request capture, preview rendering, supported apply paths |
| Example external skills | `extensions/skills/` | sidecar examples outside Hermes core |

## Local Setup

Install dependencies:

```bash
npm install
```

Copy env:

```bash
cp .env.example .env
```

Start the gateway:

```bash
npm run dev:gateway
```

Optional example sidecars:

```bash
npm run dev:selection-skill
```

```bash
npm run dev:table-skill
```

## Capability-First Change Order

If you are adding or extending a real product capability, use this order unless there is a strong reason not to:

1. `packages/contracts`
   Add or extend schemas, response types, result types, and trace events.

2. `services/gateway/src/hermes/requestTemplate.ts`
   Teach the planner when to prefer the capability.

3. `services/gateway/src/hermes/runtimeRules.ts`
   Add exact rules, safety rules, and fail-closed boundaries.

4. `services/gateway/src/hermes/structuredBody.ts`
   Normalize model output into contract-safe shapes.

5. `services/gateway/src/lib/hermesClient.ts`
   Preserve UI contract, typed traces, and user-facing fallback behavior.

6. `services/gateway/src/routes/writeback.ts`
   Add approval eligibility, expected result kind, and exact completion verification.

7. Host preview and apply layers
   - Excel: `apps/excel-addin/src/taskpane/`
   - Google Sheets: `apps/google-sheets-addon/`

8. Regression tests
   Add or update planner, normalization, gateway, and host tests together.

## Testing Expectations

### Required baseline

Run the full suite before merging:

```bash
npm test
```

### Focused suites

Use focused suites while iterating:

```bash
npm test -- services/gateway/tests/requestTemplate.test.ts
```

```bash
npm test -- services/gateway/tests/structuredBody.test.ts
```

```bash
npm test -- services/gateway/tests/writebackFlow.test.ts
```

```bash
npm test -- services/gateway/tests/excelWave6Plans.test.ts
```

```bash
npm test -- services/gateway/tests/googleSheetsWave6Plans.test.ts
```

More test notes live in [docs/testing.md](docs/testing.md).

## What Must Be Tested

If you change a capability family, test at these layers when applicable:

- planner routing
- normalization
- preview rendering
- confirm/apply behavior
- gateway approval/completion verification
- unsupported/fail-closed path

If the change is host-specific, verify both:

- supported path on the intended host
- explicit unsupported or preview-only path on the other host if parity is not there yet

## PR Types

Use the PR template and mark the right type:

- feature
- fix
- docs
- refactor/chore
- test-only

If a PR changes product behavior, the summary should explicitly say:

- what capability changed
- which hosts are affected
- whether the change is execute-capable, preview-only, or unsupported on each host

## Review Checklist Before Opening a PR

- contracts reflect the intended behavior exactly
- unsupported hosts fail closed clearly
- writeback completion proves the approved semantics, not just the target rectangle
- regression coverage exists for the changed surface
- docs are updated when the user-visible capability surface changed

You can also use [docs/reviewer-checklist.md](docs/reviewer-checklist.md) when preparing a demo-sensitive change.

## Documentation Expectations

Update docs when you change:

- capability surface
- host parity
- setup steps
- testing commands
- demo behavior

At minimum, check whether the change needs updates in:

- `README.md`
- `docs/setup/`
- `docs/testing.md`
- `docs/demo-runbook.md`
- `RELEASE.md`

## Contribution Style

- keep Hermes central in the design
- prefer exact-safe, capability-first implementations
- avoid hidden host-only heuristics unless they are explicitly fallback-only
- do not bypass approval or completion verification for convenience
- do not revert unrelated user work

## Pull Request Workflow

1. create a focused branch
2. implement the change
3. add/update tests
4. run focused suites
5. run `npm test`
6. open the PR with the template
7. state clearly whether the change is feature, fix, docs, or refactor

If the work is docs-only, say so directly in the PR and note that no runtime tests were needed.
