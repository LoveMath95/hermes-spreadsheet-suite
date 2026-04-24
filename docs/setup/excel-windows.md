# Excel on Windows Setup

This guide installs the Hermes Excel add-in on **Excel Desktop for Windows** using the add-in manifest and a trusted shared-folder catalog.

## What You Need

- Excel Desktop on Windows
- a manifest XML file:
  - `apps/excel-addin/manifest.xml` for local dev
  - or `apps/excel-addin/manifest.live.xml` for a deployed host
- a reachable HTTPS web host for the URLs referenced by the manifest
- permission to create or use a Windows file share

## Step 1. Choose the manifest

Use one of these:

- local dev:
  `apps/excel-addin/manifest.xml`
- deployed/live:
  `apps/excel-addin/manifest.live.xml`

Important:

- the manifest is only the add-in descriptor
- the task pane, commands, and assets must still be served from the HTTPS URLs inside that manifest

## Step 2. Host the add-in web assets

Make sure the manifest points to working HTTPS URLs for:

- `src/taskpane/taskpane.html`
- `src/commands/commands.html`
- icon assets

If those URLs are wrong or unreachable, Excel may show the add-in but the Hermes UI will not load correctly.

## Step 3. Put the manifest in a shared folder

Create a local or network folder that will act as the add-in catalog, then copy the manifest file into it.

Example UNC path:

```text
\\YOUR-PC\OfficeAddins
```

## Step 4. Register the shared folder as a trusted add-in catalog

In Excel:

1. Open `File -> Options -> Trust Center`.
2. Open `Trust Center Settings`.
3. Open `Trusted Add-in Catalogs`.
4. Add the UNC path of your shared folder.
5. Check `Show in Menu`.
6. Save and close Excel completely.

## Step 5. Add Hermes from Shared Folder

Reopen Excel, then:

1. Go to `Home -> Add-ins -> Advanced`.
2. Open `Shared Folder`.
3. Click `Refresh`.
4. Select `Hermes Agent`.
5. Click `Add`.

If the add-in has commands, the Hermes button/group should appear on the ribbon. If it is task-pane-only, open it from the add-in menu.

## Step 6. Verify Hermes is loading

Open the task pane and confirm:

- Hermes sidebar appears
- the task pane loads without a blank screen
- the gateway URL and task pane assets are the ones you expect

## Troubleshooting

### Hermes does not appear in Shared Folder

Check:

- the folder is actually shared
- the UNC path is reachable
- the manifest file is inside that shared folder
- Excel was restarted after the trusted catalog was added

### Hermes appears but the task pane is blank or broken

Check:

- the manifest `SourceLocation` / command URLs point to live HTTPS endpoints
- the machine trusts the HTTPS certificate if you are using local dev TLS
- cached Office files are not stale; restart Excel after manifest changes

### Ribbon commands look stale after a manifest update

Close Excel fully, clear Office cache if needed, then reopen and reinstall the add-in from the shared folder.

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

- Microsoft Learn: Office add-in manifests  
  https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests
- Microsoft Learn: Sideload Office add-ins for testing from a network share  
  https://learn.microsoft.com/en-us/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins
