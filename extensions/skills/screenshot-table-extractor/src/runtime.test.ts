import { describe, expect, it } from "vitest";
import { extractTableForMode } from "./runtime.ts";

const payload = {
  runId: "run_1",
  requestId: "req_1",
  userMessage: "Extract this into Sheet3 starting at B4",
  attachment: {
    id: "att_1",
    fileName: "capture.png",
    previewUrl: "http://example.test/capture.png"
  },
  targetSheet: "Sheet3",
  targetRange: "B4"
};

describe("screenshot extraction runtime", () => {
  it("returns explicit demo metadata in demo mode", async () => {
    const result = await extractTableForMode({
      mode: "demo",
      reviewerSafeMode: false,
      visionExtractorUrl: undefined,
      payload
    });

    expect(result.extractionMode).toBe("demo");
    expect(result.sheetImportPlan.warnings.some((warning) => /demo/i.test(warning))).toBe(true);
  });

  it("fails clearly in reviewer-safe mode when real extraction is unavailable", async () => {
    await expect(() => extractTableForMode({
      mode: "demo",
      reviewerSafeMode: true,
      visionExtractorUrl: undefined,
      payload
    })).rejects.toThrow(/reviewer-safe/i);
  });
});
