import { describe, expect, it } from "vitest";
import { rangeHasExistingContent } from "../../../apps/excel-addin/src/taskpane/rangeSafety.js";

describe("range safety helpers", () => {
  it("detects non-empty cells in a target range", () => {
    expect(rangeHasExistingContent([
      ["", null],
      [0, ""]
    ])).toBe(true);
  });

  it("treats all-empty ranges as safe for import", () => {
    expect(rangeHasExistingContent([
      ["", null],
      [undefined, ""]
    ])).toBe(false);
  });
});
