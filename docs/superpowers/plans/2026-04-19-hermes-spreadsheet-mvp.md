# Hermes Spreadsheet MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hackathon-ready cross-platform spreadsheet AI scaffold for Excel and Google Sheets that always routes user requests to remote Hermes and supports selection Q&A plus image-to-table preview-and-insert flows.

**Architecture:** Use a standalone monorepo outside Hermes core. Put shared contracts and browser-safe request logic in packages, route all execution through a Node gateway, and keep Excel and Google Sheets as thin host adapters that collect context and apply only confirmed write plans. Implement example spreadsheet capabilities as external sidecar skills registered outside Hermes core.

**Tech Stack:** TypeScript, Node.js, Express, Office.js, Google Apps Script, Zod, Vitest, Multer, server-sent events.

---

### Task 1: Repo Skeleton And Contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/schemas.ts`
- Test: `packages/contracts/tests/contracts.test.ts`

- [ ] Step 1: Write failing contract tests for Hermes requests, trace events, and write plans.
- [ ] Step 2: Run `npm test -- packages/contracts/tests/contracts.test.ts` and verify the failure is caused by missing contract exports.
- [ ] Step 3: Implement the shared schemas and exports with Zod.
- [ ] Step 4: Re-run the contract tests and confirm they pass.

### Task 2: Gateway Core

**Files:**
- Create: `services/gateway/package.json`
- Create: `services/gateway/tsconfig.json`
- Create: `services/gateway/src/server.ts`
- Create: `services/gateway/src/app.ts`
- Create: `services/gateway/src/routes/requests.ts`
- Create: `services/gateway/src/routes/uploads.ts`
- Create: `services/gateway/src/routes/trace.ts`
- Create: `services/gateway/src/routes/writeback.ts`
- Create: `services/gateway/src/lib/config.ts`
- Create: `services/gateway/src/lib/store.ts`
- Create: `services/gateway/src/lib/traceBus.ts`
- Create: `services/gateway/src/lib/approval.ts`
- Create: `services/gateway/src/lib/hermesClient.ts`
- Test: `services/gateway/tests/approval.test.ts`
- Test: `services/gateway/tests/traceBus.test.ts`

- [ ] Step 1: Write failing tests for approval token signing and trace event fan-out.
- [ ] Step 2: Run the targeted gateway tests and verify they fail for missing implementations.
- [ ] Step 3: Implement the gateway core and route handlers.
- [ ] Step 4: Re-run the targeted gateway tests and confirm they pass.

### Task 3: Shared Browser Client

**Files:**
- Create: `packages/shared-client/package.json`
- Create: `packages/shared-client/tsconfig.json`
- Create: `packages/shared-client/src/index.ts`
- Create: `packages/shared-client/src/trace.ts`
- Create: `packages/shared-client/src/request.ts`
- Create: `packages/shared-client/src/types.ts`

- [ ] Step 1: Implement host-agnostic helpers for building requests, formatting proof metadata, and talking to the gateway.
- [ ] Step 2: Keep the package browser-safe and free of Office.js or Apps Script dependencies.

### Task 4: Excel Office.js Add-in

**Files:**
- Create: `apps/excel-addin/package.json`
- Create: `apps/excel-addin/manifest.xml`
- Create: `apps/excel-addin/src/taskpane/taskpane.html`
- Create: `apps/excel-addin/src/taskpane/taskpane.css`
- Create: `apps/excel-addin/src/taskpane/taskpane.ts`
- Create: `apps/excel-addin/src/commands/commands.ts`

- [ ] Step 1: Build the minimal task pane shell with header, conversation list, input bar, attachment button, and proof line.
- [ ] Step 2: Implement Office.js selection context collection and confirmed write-back only.
- [ ] Step 3: Wire ribbon commands to open Hermes and prefill chat intents.

### Task 5: Google Sheets Add-on

**Files:**
- Create: `apps/google-sheets-addon/appsscript.json`
- Create: `apps/google-sheets-addon/src/Code.gs`
- Create: `apps/google-sheets-addon/html/Sidebar.html`
- Create: `apps/google-sheets-addon/html/Sidebar.css.html`
- Create: `apps/google-sheets-addon/html/Sidebar.js.html`

- [ ] Step 1: Build the custom menu and sidebar entry points.
- [ ] Step 2: Implement sidebar chat shell matching Excel.
- [ ] Step 3: Implement Apps Script context reads, uploads, and confirmed write-back bridge methods.

### Task 6: External Skills And Registry

**Files:**
- Create: `extensions/registry/skill-registry.json`
- Create: `extensions/skills/selection-explainer/package.json`
- Create: `extensions/skills/selection-explainer/tsconfig.json`
- Create: `extensions/skills/selection-explainer/src/server.ts`
- Create: `extensions/skills/screenshot-table-extractor/package.json`
- Create: `extensions/skills/screenshot-table-extractor/tsconfig.json`
- Create: `extensions/skills/screenshot-table-extractor/src/server.ts`

- [ ] Step 1: Implement two sidecar services with explicit manifests and no Hermes-core coupling.
- [ ] Step 2: Keep outputs structured and chain-of-thought-free.
- [ ] Step 3: Make the gateway register and invoke them via the external registry only.

### Task 7: Docs And Local Run

**Files:**
- Create: `.env.example`
- Create: `README.md`

- [ ] Step 1: Document local run order for gateway and skills.
- [ ] Step 2: Document Excel sideload steps and Google Sheets Apps Script deployment steps.
- [ ] Step 3: Document the demo script proving remote Hermes processing with run IDs and trace events.
