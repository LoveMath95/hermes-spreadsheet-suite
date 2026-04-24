# Hermes Spreadsheet Suite Review Brief

## What this repo is

Hermes Spreadsheet Suite is a scaffold for a spreadsheet AI assistant that runs across:

- Microsoft Excel via Office.js
- Google Sheets via Apps Script
- a backend gateway that validates requests, forwards them to a remote Hermes Agent, and manages uploads, trace, and write-back approval

The remote reasoning brain is **Hermes Agent**. Hermes core is **not** in this repository and must be treated as immutable.

## What this repo owns

- Step 2 request collection in spreadsheet hosts
- Step 2 request validation in the gateway
- Step 1 structured response validation and normalization in the gateway
- attachment upload/register flow
- trace polling
- write-back approval and completion flow
- minimal chat-first host UI
- reviewer-safe behavior enforcement at the gateway boundary

## What this repo does not own

- Hermes core source
- internal Hermes orchestration logic
- upstream model/provider behavior beyond the remote Hermes Agent contract

## Product goal

Provide a thin spreadsheet host and gateway layer around a remote Hermes Agent so that:

1. users can ask about spreadsheet selections
2. users can ask for formula help
3. users can upload table screenshots/images for extraction preview
4. write-back only happens after explicit confirmation

## Critical review boundaries

Any review must preserve these invariants:

- Hermes core remains untouched
- external Step 1 and Step 2 contracts stay stable unless explicitly intended
- reviewer-safe unavailable mode must not fabricate extracted content
- demo mode must be explicitly labeled as demo
- real mode must preserve write proposal safety and confirmation
- hosts remain thin clients; gateway remains a validator/forwarder, not the reasoning brain

## Current critical flows

- Flow 1: explain/summarize selection or formula help
- Flow 2 real: image extraction -> preview/import plan -> explicit confirmation
- Flow 2 demo: demo-labeled preview/import plan
- Flow 2 reviewer-safe unavailable: contract-valid unavailable-safe response with no fake preview/import plan

## High-signal repo areas for review

- `packages/contracts/src/schemas.ts`
- `packages/shared-client/src/request.ts`
- `services/gateway/src/routes/requests.ts`
- `services/gateway/src/lib/hermesClient.ts`
- `services/gateway/src/hermes/structuredBody.ts`
- `services/gateway/src/routes/uploads.ts`
- `services/gateway/src/routes/writeback.ts`
- `apps/google-sheets-addon/src/Code.gs`
- `apps/google-sheets-addon/html/Sidebar.js.html`
- `apps/excel-addin/src/taskpane/taskpane.js`

## Review priorities

1. Contract mismatches and normalization errors
2. Cross-host inconsistencies between Excel and Google Sheets
3. Unsafe assumptions around active cell, referenced cells, selections, and attachments
4. Reviewer-safe regressions
5. Write-back safety regressions
6. Broken trace/warnings/proof preservation
7. Missing tests for critical boundary behavior
