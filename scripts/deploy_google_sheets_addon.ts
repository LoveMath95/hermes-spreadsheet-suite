import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createBoundGoogleSheetsScriptProject,
  extractGoogleSpreadsheetId,
  isAppsScriptReachableGatewayBaseUrl,
  readClaspAuthorizedUser,
  refreshClaspAccessToken,
  stageGoogleSheetsAddonProject,
  type GoogleSheetsForceExtractionMode
} from "../services/gateway/src/lib/googleSheetsAddonDeploy.js";

type CliArgs = {
  spreadsheet: string;
  gatewayUrl: string;
  clientVersion: string;
  projectTitle: string;
  scriptId?: string;
  reviewerSafeMode: boolean;
  forceExtractionMode: GoogleSheetsForceExtractionMode;
  keepStageDir: boolean;
};

function printUsage(): void {
  console.error(`
Usage:
  npm run deploy:google-sheets -- --spreadsheet <sheet-id-or-url> --gateway-url <https://gateway.example.com>

Optional:
  --client-version <value>
  --project-title <value>
  --script-id <apps-script-project-id>
  --reviewer-safe-mode
  --force-extraction-mode <real|demo|unavailable>
  --keep-stage-dir

Examples:
  npm run deploy:google-sheets -- --spreadsheet "https://docs.google.com/spreadsheets/d/FILE_ID/edit" --gateway-url "https://gateway.example.com"
  npm run deploy:google-sheets -- --spreadsheet FILE_ID --gateway-url "https://gateway.example.com" --script-id SCRIPT_ID
`.trim());
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    spreadsheet: "",
    gatewayUrl: "",
    clientVersion: "google-sheets-addon-live-demo",
    projectTitle: "Hermes Agent",
    reviewerSafeMode: false,
    forceExtractionMode: null,
    keepStageDir: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case "--spreadsheet":
      case "--sheet":
        args.spreadsheet = argv[++index] || "";
        break;
      case "--gateway-url":
        args.gatewayUrl = argv[++index] || "";
        break;
      case "--client-version":
        args.clientVersion = argv[++index] || "";
        break;
      case "--project-title":
        args.projectTitle = argv[++index] || "";
        break;
      case "--script-id":
        args.scriptId = argv[++index] || "";
        break;
      case "--reviewer-safe-mode":
        args.reviewerSafeMode = true;
        break;
      case "--force-extraction-mode": {
        const value = (argv[++index] || "").trim();
        if (value !== "real" && value !== "demo" && value !== "unavailable") {
          throw new Error("force-extraction-mode must be real, demo, or unavailable.");
        }
        args.forceExtractionMode = value;
        break;
      }
      case "--keep-stage-dir":
        args.keepStageDir = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!args.spreadsheet) {
    throw new Error("--spreadsheet is required.");
  }
  if (!args.gatewayUrl) {
    throw new Error("--gateway-url is required.");
  }

  return args;
}

function runClaspCommand(args: string[], cwd: string): void {
  const result = spawnSync("npx", ["--yes", "@google/clasp", ...args], {
    cwd,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`clasp ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  const spreadsheetId = extractGoogleSpreadsheetId(cli.spreadsheet);

  if (!isAppsScriptReachableGatewayBaseUrl(cli.gatewayUrl)) {
    throw new Error(
      "The provided gateway URL is not suitable for Google Sheets. Use a public HTTPS host, not localhost, HTTP, or a private LAN address."
    );
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, "..");
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), `hermes-gs-addon-${spreadsheetId}-`));
  let scriptId = cli.scriptId;

  try {
    if (scriptId) {
      console.log(`Using existing Apps Script project: ${scriptId}`);
    } else {
      const auth = await readClaspAuthorizedUser();
      const accessToken = await refreshClaspAccessToken(auth);
      const created = await createBoundGoogleSheetsScriptProject({
        accessToken,
        spreadsheetId,
        title: cli.projectTitle
      });
      scriptId = created.scriptId;
      console.log(`Created bound Apps Script project: ${scriptId}`);
    }

    const writtenFiles = await stageGoogleSheetsAddonProject({
      repoRoot,
      stageDir,
      scriptId,
      deployment: {
        gatewayBaseUrl: cli.gatewayUrl,
        clientVersion: cli.clientVersion,
        reviewerSafeMode: cli.reviewerSafeMode,
        forceExtractionMode: cli.forceExtractionMode
      }
    });

    runClaspCommand(["push", "--force"], stageDir);

    const claspConfig = JSON.parse(
      fs.readFileSync(path.join(stageDir, ".clasp.json"), "utf8")
    ) as { scriptId?: string };

    console.log("");
    console.log("Hermes Google Sheets add-on deployed.");
    console.log(`Spreadsheet: ${spreadsheetId}`);
    console.log(`Apps Script project: ${claspConfig.scriptId || scriptId || "(unknown)"}`);
    console.log(`Gateway URL: ${cli.gatewayUrl}`);
    console.log(`Client version: ${cli.clientVersion}`);
    console.log(`Stage dir: ${stageDir}`);
    console.log(`Files staged: ${writtenFiles.length}`);
    console.log("");
    console.log("Next:");
    console.log("1. Open or reload the spreadsheet.");
    console.log("2. Authorize the bound script if Google prompts.");
    console.log("3. Use the Hermes menu to open the sidebar.");
  } finally {
    if (!cli.keepStageDir) {
      fs.rmSync(stageDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
});
