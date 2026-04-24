export type ExtractionMode = "real" | "demo" | "disabled";

export type InvokePayload = {
  runId: string;
  requestId: string;
  userMessage: string;
  attachment: {
    id: string;
    fileName: string;
    previewUrl?: string;
  };
  targetSheet: string;
  targetRange: string;
};

export type ExtractedTable = {
  headers?: string[];
  values: Array<Array<string | number | null>>;
  confidence: number;
  warnings: string[];
};

export type ExtractionResult = {
  extractionMode: "real" | "demo";
  sheetImportPlan: {
    sourceAttachmentId: string;
    targetSheet: string;
    targetRange: string;
    headers?: string[];
    values: Array<Array<string | number | null>>;
    confidence: number;
    warnings: string[];
    requiresConfirmation: true;
  };
  provider: string;
  skillName: "ScreenshotTableExtractionSkill";
  message: string;
};

function normalizeMode(mode: string | undefined): ExtractionMode {
  if (mode === "real" || mode === "demo" || mode === "disabled") {
    return mode;
  }

  return "disabled";
}

export function getExtractionRuntimeConfig(env = process.env): {
  mode: ExtractionMode;
  reviewerSafeMode: boolean;
  visionExtractorUrl?: string;
} {
  return {
    mode: normalizeMode(env.IMAGE_EXTRACTION_MODE),
    reviewerSafeMode: env.REVIEWER_SAFE_MODE === "true",
    visionExtractorUrl: env.VISION_EXTRACTOR_URL || undefined
  };
}

async function extractFromRemoteVision(payload: InvokePayload, endpoint: string): Promise<ExtractedTable> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      imageUrl: payload.attachment.previewUrl,
      instruction: "Extract a 2D table, preserve row and column order, return JSON only."
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Remote vision extractor failed with ${response.status}.`);
  }

  return response.json() as Promise<ExtractedTable>;
}

function buildDemoExtraction(payload: InvokePayload): ExtractedTable {
  return {
    headers: ["Item", "Quantity", "Status"],
    values: [
      ["Widget A", 12, "Open"],
      ["Widget B", 6, "Closed"],
      ["Widget C", 18, "Open"]
    ],
    confidence: 0.58,
    warnings: [
      `Demo extraction mode is active for ${payload.attachment.fileName}.`,
      "This preview is explicitly demo data and must not be presented as real OCR output."
    ]
  };
}

export async function extractTableForMode(input: {
  mode: ExtractionMode;
  reviewerSafeMode: boolean;
  visionExtractorUrl?: string;
  payload: InvokePayload;
}): Promise<ExtractionResult> {
  if (input.reviewerSafeMode && input.mode !== "real") {
    throw new Error(
      "Reviewer-safe mode requires IMAGE_EXTRACTION_MODE=real. Demo or disabled extraction is not allowed."
    );
  }

  if (input.mode === "disabled") {
    throw new Error(
      "Image extraction is disabled. Set IMAGE_EXTRACTION_MODE=real or IMAGE_EXTRACTION_MODE=demo."
    );
  }

  if (input.mode === "real") {
    if (!input.visionExtractorUrl) {
      throw new Error(
        "IMAGE_EXTRACTION_MODE=real requires VISION_EXTRACTOR_URL. No silent demo fallback is allowed."
      );
    }

    const extraction = await extractFromRemoteVision(input.payload, input.visionExtractorUrl);
    return {
      extractionMode: "real",
      provider: "remote-vision-adapter",
      skillName: "ScreenshotTableExtractionSkill",
      message: `I processed the image through Hermes and prepared a real extraction preview for ${input.payload.targetSheet}!${input.payload.targetRange}. Confirm before any write-back.`,
      sheetImportPlan: {
        sourceAttachmentId: input.payload.attachment.id,
        targetSheet: input.payload.targetSheet,
        targetRange: input.payload.targetRange,
        headers: extraction.headers,
        values: extraction.values,
        confidence: extraction.confidence,
        warnings: extraction.warnings,
        requiresConfirmation: true
      }
    };
  }

  const extraction = buildDemoExtraction(input.payload);
  return {
    extractionMode: "demo",
    provider: "table-sidecar-demo",
    skillName: "ScreenshotTableExtractionSkill",
    message: `I processed the image through Hermes in demo extraction mode and prepared a preview for ${input.payload.targetSheet}!${input.payload.targetRange}. Confirm before any write-back.`,
    sheetImportPlan: {
      sourceAttachmentId: input.payload.attachment.id,
      targetSheet: input.payload.targetSheet,
      targetRange: input.payload.targetRange,
      headers: extraction.headers,
      values: extraction.values,
      confidence: extraction.confidence,
      warnings: extraction.warnings,
      requiresConfirmation: true
    }
  };
}
