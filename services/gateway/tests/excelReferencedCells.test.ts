import { describe, expect, it } from "vitest";
import {
  extractReferencedA1Notations,
  getPromptReferencedA1Notations
} from "../../../apps/excel-addin/src/taskpane/referencedCells.js";

describe("Excel prompt cell references", () => {
  it("extracts an explicit single-cell reference from the prompt", () => {
    expect(extractReferencedA1Notations("why cell h5 error?")).toEqual(["H5"]);
  });

  it("deduplicates repeated references and removes dollar signs", () => {
    expect(
      extractReferencedA1Notations("Explain $H$5 and h5, then compare with B4.")
    ).toEqual(["H5", "B4"]);
  });

  it("omits the active cell from prompt-referenced cells", () => {
    expect(
      getPromptReferencedA1Notations("Explain H5 and compare it with B4.", "H5")
    ).toEqual(["B4"]);
  });
});
