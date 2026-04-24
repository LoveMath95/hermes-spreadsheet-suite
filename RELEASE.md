# Hermes Spreadsheet Suite Release

## Scope

This repo contains the Hermes spreadsheet demo stack:

- Excel desktop add-in
- Google Sheets sidebar add-on
- Hermes gateway for request routing and write-back approval
- Shared contracts and rendering helpers

## Deployment Endpoints

- Excel manifest: `https://your-deployment-host.example.com/hermes-excel/manifest.live.xml`
- Excel task pane: `https://your-deployment-host.example.com/hermes-excel/src/taskpane/taskpane.html`
- Gateway health: `https://your-deployment-host.example.com/hermes-gateway/health`

## Release Notes

- Excel command icons use raster assets that Office accepts reliably.
- Excel add-in manifest now uses shared runtime for ribbon commands and task pane coordination.
- Excel task pane is marked with `Office.AutoShowTaskpaneWithDocument`.
- Excel runtime sets demo-friendly startup defaults on load:
  - `Office.StartupBehavior.load`
  - `Office.AutoShowTaskpaneWithDocument = true`
- Runtime-only artifacts are excluded from git:
  - `.env`
  - `output/`
  - local Playwright dumps

## Install Notes

### Windows Excel

Use Shared Folder sideloading with a trusted UNC catalog that contains the live manifest file.

### macOS Excel

Copy the manifest into the Excel `wef` sideload directory, then restart Excel.

## Operational Notes

- If Excel shows stale ribbon metadata after a manifest change, clear the Office cache and restart Excel.
- This repo does not include production secrets. Copy `.env.example` and provide your own runtime values on the host machine.

## Verification Snapshot

- Local git history starts at commit `719eeb9`.
- `npm test` currently still has pre-existing red tests in Google Sheets wave 5/6 flows, so the suite is not fully green at this release point.
