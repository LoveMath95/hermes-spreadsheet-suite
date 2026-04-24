Review this repository as a production-minded senior engineer.

Repository purpose:

- Cross-platform spreadsheet AI assistant scaffold for Excel and Google Sheets
- Hosts collect spreadsheet context and attachments
- Gateway validates Step 2 requests, forwards them to a remote Hermes Agent, validates/normalizes Step 1 structured output, and manages uploads/trace/write-back approval
- Hermes core is outside this repo and immutable

Review scope:

- contracts
- gateway request/response validation
- structured-body normalization
- upload/register flow
- write-back safety
- Google Sheets host request generation
- Excel host request generation
- critical-flow tests

Do not focus on:

- style-only cleanup
- broad architecture rewrites without evidence
- features not already implied by the current product

Review goals:

1. find real bugs or behavioral regressions
2. catch contract mismatches or brittle normalization behavior
3. catch cross-host inconsistencies
4. catch reviewer-safe/demo-mode mistakes
5. catch unsafe assumptions around active cell, referenced cells, selected range, attachments, and confirmation
6. identify missing tests around these risks

Required answer format:

## Findings
- Severity: critical/high/medium/low
- File:
- Issue:
- Impact:
- Smallest safe fix:

## Open Questions

## Residual Risk

If no meaningful findings exist, say: "No material findings."

Repository context follows below.
