# Excel on macOS Setup

This guide installs the Hermes Excel add-in on **Excel for Mac** by sideloading the manifest into the local `wef` folder.

## What You Need

- Excel for Mac
- a manifest XML file:
  - `apps/excel-addin/manifest.xml` for local dev
  - or `apps/excel-addin/manifest.live.xml` for a deployed host
- a reachable HTTPS web host for the URLs referenced by the manifest

## Step 1. Choose the manifest

Use one of these:

- local dev:
  `apps/excel-addin/manifest.xml`
- deployed/live:
  `apps/excel-addin/manifest.live.xml`

## Step 2. Make sure the web assets are reachable

The manifest must point to working HTTPS URLs for:

- `src/taskpane/taskpane.html`
- `src/commands/commands.html`
- icons/assets

If those URLs do not load from the Mac, Hermes will not render correctly even if the manifest is sideloaded.

## Step 3. Copy the manifest into Excel's sideload folder

Excel for Mac uses this folder:

```text
~/Library/Containers/com.microsoft.Excel/Data/Documents/wef
```

If the folder does not exist, create it.

Then copy the chosen manifest into that folder.

Example:

```bash
mkdir -p ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef
cp apps/excel-addin/manifest.live.xml ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/hermes-agent-live.xml
```

## Step 4. Restart Excel

Quit Excel completely, then reopen it.

After restart:

1. Open a workbook.
2. Go to `Home -> Add-ins`.
3. Open `Hermes Agent`.

## Step 5. Verify Hermes is loading

Confirm:

- the Hermes task pane appears
- the add-in is using the manifest you expect
- the task pane assets load from the correct HTTPS host

## Troubleshooting

### Hermes does not appear

Check:

- the manifest file is in the `wef` folder
- Excel was fully quit before reopening
- there is not an older stale Hermes manifest in the same folder

### Hermes appears but the UI is stale

Remove old Hermes manifests from the `wef` folder, keep only the intended one, then restart Excel again.

### Hermes appears but the task pane is blank or broken

Check:

- the manifest URLs are valid
- the Mac can reach the HTTPS host
- local development certificates are trusted if you are using a local dev server

## Repo Pointers

- manifest files:
  - [manifest.xml](../../apps/excel-addin/manifest.xml)
  - [manifest.live.xml](../../apps/excel-addin/manifest.live.xml)
- task pane:
  - [taskpane.html](../../apps/excel-addin/src/taskpane/taskpane.html)
  - [taskpane.js](../../apps/excel-addin/src/taskpane/taskpane.js)
- commands:
  - [commands.html](../../apps/excel-addin/src/commands/commands.html)

## Official References

- Microsoft Learn: Sideload Office add-ins on Mac for testing  
  https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-an-office-add-in-on-mac
- Microsoft Learn: Office add-in manifests  
  https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests
