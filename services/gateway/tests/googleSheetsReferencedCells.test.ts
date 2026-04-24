import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractReferencedA1Notations_ } = require("../../../apps/google-sheets-addon/src/ReferencedCells.js");

describe("Google Sheets prompt cell references", () => {
  it("extracts an explicit single-cell reference from the prompt", () => {
    expect(extractReferencedA1Notations_("why cell f6 error?")).toEqual(["F6"]);
  });

  it("deduplicates repeated references and removes dollar signs", () => {
    expect(
      extractReferencedA1Notations_("Explain $F$6 and f6, then compare with B4.")
    ).toEqual(["F6", "B4"]);
  });
});
