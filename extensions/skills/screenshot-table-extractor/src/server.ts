import express from "express";
import type { Request, Response } from "express";
import { extractTableForMode, getExtractionRuntimeConfig, type InvokePayload } from "./runtime.js";

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req: Request, res: Response) => {
  const runtime = getExtractionRuntimeConfig();
  res.json({
    ok: true,
    skill: "ScreenshotTableExtractionSkill",
    extractionMode: runtime.mode,
    reviewerSafeMode: runtime.reviewerSafeMode
  });
});

app.post("/invoke", async (req: Request, res: Response) => {
  const payload = req.body as InvokePayload;
  const runtime = getExtractionRuntimeConfig();

  try {
    const extraction = await extractTableForMode({
      mode: runtime.mode,
      reviewerSafeMode: runtime.reviewerSafeMode,
      visionExtractorUrl: runtime.visionExtractorUrl,
      payload
    });

    res.json({
      type: "sheet_import_plan",
      message: extraction.message,
      provider: extraction.provider,
      skillName: extraction.skillName,
      extractionMode: extraction.extractionMode,
      sheetImportPlan: extraction.sheetImportPlan
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image extraction failed.";
    res.status(503).json({
      error: message,
      extractionMode: runtime.mode
    });
  }
});

const port = Number(process.env.PORT ?? 8792);
app.listen(port, () => {
  console.log(`[table-extractor-skill] listening on ${port}`);
});
