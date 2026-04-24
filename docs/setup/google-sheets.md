# Google Sheets Setup

Hermes on Google Sheets is not installed through an Office manifest.

It runs as a **container-bound Apps Script sidebar** attached to the target spreadsheet.

## Recommended Path

Use the automated deploy command instead of copying files by hand.

## What You Need

- a Google account with Apps Script access
- a target Google Sheet or demo workbook
- a public HTTPS Hermes gateway URL
- `clasp` access through `npx`
- a logged-in `clasp` session

Authenticate once before the first deploy:

```bash
npx @google/clasp login
```

## Automated Deploy

From the repo root:

```bash
npm run deploy:google-sheets -- --spreadsheet "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit" --gateway-url "https://your-gateway.example.com"
```

What this does:

1. stages the Google Sheets add-on source into a temporary Apps Script project layout
2. generates a deployment config file with the gateway URL and client version
3. creates a bound Apps Script project if one does not already exist
4. pushes the Hermes sidebar/menu source into that bound project

Optional flags:

```bash
--script-id <existing-apps-script-project-id>
--client-version google-sheets-addon-live-demo
--project-title "Hermes Agent"
--reviewer-safe-mode
--force-extraction-mode demo
--keep-stage-dir
```

After the push finishes:

1. reload the spreadsheet
2. authorize the script if Google prompts
3. use the `Hermes` menu to open the sidebar

The gateway URL must be a public HTTPS address reachable from both the Sheets browser session and Apps Script. Do not use `localhost`, plain `http`, or a private LAN address.

## Manual Fallback

If you want or need to wire the bound Apps Script project by hand, use the files below.

## Files You Need From This Repo

Copy these into the bound Apps Script project:

- [appsscript.json](../../apps/google-sheets-addon/appsscript.json)
- [Code.gs](../../apps/google-sheets-addon/src/Code.gs)
- [ReferencedCells.js](../../apps/google-sheets-addon/src/ReferencedCells.js)
- [Wave1Plans.js](../../apps/google-sheets-addon/src/Wave1Plans.js)
- [Sidebar.html](../../apps/google-sheets-addon/html/Sidebar.html)
- [Sidebar.css.html](../../apps/google-sheets-addon/html/Sidebar.css.html)
- [Sidebar.js.html](../../apps/google-sheets-addon/html/Sidebar.js.html)

## Step 1. Open the spreadsheet

Open the Google Sheet that should host Hermes.

If you want a disposable demo environment, use the flow in [docs/demo-runbook.md](../demo-runbook.md).

## Step 2. Open the bound Apps Script project

In Google Sheets:

1. Open `Extensions -> Apps Script`.
2. Use the bound project attached to that spreadsheet.

## Step 3. Replace the project files

Replace the Apps Script project contents with the files listed above.

The add-on is bound to the spreadsheet, so these files become the sidebar/menu logic for that document.

## Step 4. Set script properties

In Apps Script project settings, set:

```text
HERMES_GATEWAY_URL=https://your-gateway.example.com
HERMES_CLIENT_VERSION=google-sheets-addon-dev
```

Optional flags:

```text
HERMES_REVIEWER_SAFE_MODE=false
HERMES_FORCE_EXTRACTION_MODE=
```

Use the real gateway URL that your spreadsheet should call.

If you deploy with `npm run deploy:google-sheets`, you do not need to set these manually unless you want to override the generated deployment config later.

## Step 5. Save and authorize

1. Save the Apps Script project.
2. Reload the spreadsheet.
3. Use the `Hermes` custom menu to open the sidebar.
4. On first run, authorize the script scopes Google asks for.

## Step 6. Verify the sidebar

Confirm:

- the `Hermes` menu appears
- the sidebar opens
- the sidebar can talk to the configured gateway
- read-only requests work before testing writeback flows

## Troubleshooting

### The Hermes menu does not appear

Check:

- the script is bound to the spreadsheet
- the files were saved successfully
- the spreadsheet was reloaded after saving
- the deploy command finished without a `clasp` error

### The sidebar opens but cannot call Hermes

Check:

- `HERMES_GATEWAY_URL` is set correctly
- the gateway is reachable from the browser
- the gateway health endpoint is up

### Writes fail immediately

Check:

- the script has been authorized
- the bound project has all required files
- the request is using a supported capability on Google Sheets

### Live demo behavior looks stale

Re-copy the source files from `apps/google-sheets-addon/`, save, and reload the spreadsheet again.

If you used the automated flow, rerun the deploy command and reload the sheet.

## Repo Pointers

- source root: [apps/google-sheets-addon](../../apps/google-sheets-addon/)
- demo runbook: [docs/demo-runbook.md](../demo-runbook.md)

## Official References

- Google Apps Script: Container-bound scripts  
  https://developers.google.com/apps-script/guides/bound
- Google Apps Script: Dialogs and sidebars  
  https://developers.google.com/apps-script/guides/dialogs
- Google Apps Script: Extending Google Sheets  
  https://developers.google.com/apps-script/guides/sheets
