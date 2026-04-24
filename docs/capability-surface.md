# Capability Surface

This document is the high-level map of what Hermes Spreadsheet Suite can plan, preview, and execute today.

Hermes remains the central planner. The capability families below describe the spreadsheet product surface that the gateway and hosts know how to carry safely.

## First-Class Capability Families

- chat and range explanation
- formula suggestion, repair, and explanation
- sheet updates and image-to-table imports
- workbook and sheet structure changes
- static formatting and conditional formatting
- sorting and filtering
- data validation and named ranges
- range transfer and data cleanup
- analysis reports, pivot tables, and charts
- composite multi-step workflows with history, dry-run, and execution control
- external data plans for Google Sheets:
  - `GOOGLEFINANCE`
  - `IMPORTHTML`
  - `IMPORTXML`
  - `IMPORTDATA`

## Host Reality

The contract families are shared, but host support is not perfectly symmetric.

- some plan types are exact-safe on both Excel and Google Sheets
- some are exact-safe on only one host
- some are preview-only on one host and executable on the other
- unsupported paths should fail closed with an explicit preview or unsupported message, not with silent degradation

## How To Read This Repo

- `packages/contracts/` defines the capability families and schemas
- `services/gateway/src/hermes/` controls how Hermes is prompted and how structured responses are normalized
- `services/gateway/src/routes/writeback.ts` verifies approved execution against the exact approved plan
- `apps/excel-addin/` and `apps/google-sheets-addon/` decide how each host previews and applies each supported family

## Where To Look Next

- setup guides: [docs/setup/README.md](setup/README.md)
- contributor flow: [CONTRIBUTING.md](../CONTRIBUTING.md)
- testing guide: [docs/testing.md](testing.md)
- current backlog: [docs/missing-capabilities-backlog-2026-04-23.md](missing-capabilities-backlog-2026-04-23.md)
