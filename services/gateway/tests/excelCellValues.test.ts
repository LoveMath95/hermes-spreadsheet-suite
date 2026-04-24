import { describe, expect, it } from "vitest";
import {
  normalizeExcelCellValue,
  normalizeExcelMatrixValues
} from "../../../apps/excel-addin/src/taskpane/cellValues.js";

describe("Excel cell value normalization", () => {
  it("normalizes Date objects into ISO strings", () => {
    expect(
      normalizeExcelCellValue(new Date("2026-04-19T00:00:00.000Z"))
    ).toBe("2026-04-19T00:00:00.000Z");
  });

  it("normalizes undefined to null and preserves primitives", () => {
    expect(
      normalizeExcelMatrixValues([
        [undefined, "A", 3, true, null]
      ])
    ).toEqual([
      [null, "A", 3, true, null]
    ]);
  });

  it("stringifies unsupported object values to stay contract-safe", () => {
    expect(
      normalizeExcelCellValue({ kind: "custom" })
    ).toBe("[object Object]");
  });
});
