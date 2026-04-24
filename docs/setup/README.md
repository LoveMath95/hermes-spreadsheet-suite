# Setup Guides

Use the guide that matches the host you want to run.

## Pick Your Host

| Host | Guide | Install Model |
| --- | --- | --- |
| Excel on Windows | [Excel Windows Setup](excel-windows.md) | Office add-in manifest sideloaded from a trusted network share catalog |
| Excel on macOS | [Excel macOS Setup](excel-macos.md) | Office add-in manifest sideloaded through the local `wef` folder |
| Google Sheets | [Google Sheets Setup](google-sheets.md) | Container-bound Apps Script project with Hermes sidebar files |

## Which Manifest To Use For Excel

This repo includes:

- `apps/excel-addin/manifest.xml`
- `apps/excel-addin/manifest.live.xml`

Typical usage:

- `manifest.xml`
  use for local development when you control the local web origin in the manifest
- `manifest.live.xml`
  use for a deployed environment where the task pane and command URLs already point at a live host

In both cases, the manifest must point to a reachable HTTPS origin for:

- `src/taskpane/taskpane.html`
- `src/commands/commands.html`
- icons/assets

## Related Docs

- [README.md](../../README.md)
- [RELEASE.md](../../RELEASE.md)
- [docs/demo-runbook.md](../demo-runbook.md)
