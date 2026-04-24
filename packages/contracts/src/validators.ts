import { z, type RefinementCtx } from "zod";

export type RectangleShape = {
  rows: number;
  columns: number;
};

export type ParsedA1Cell = {
  column: number;
  row: number;
};

export type ParsedA1Range = ParsedA1Cell & {
  endColumn: number;
  endRow: number;
  rows: number;
  columns: number;
};

const A1_CELL_PATTERN = /^\$?([A-Z]+)\$?([1-9][0-9]*)$/i;
const A1_RANGE_PATTERN =
  /^\$?([A-Z]+)\$?([1-9][0-9]*)(?::\$?([A-Z]+)\$?([1-9][0-9]*))?$/i;

export function columnLettersToNumber(value: string): number | null {
  if (!/^[A-Z]+$/i.test(value)) {
    return null;
  }

  let result = 0;
  const normalized = value.toUpperCase();

  for (const char of normalized) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }

  return result;
}

export function parseA1Cell(value: string): ParsedA1Cell | null {
  const match = value.match(A1_CELL_PATTERN);
  if (!match) {
    return null;
  }

  const [, columnLetters, rowValue] = match;
  const column = columnLettersToNumber(columnLetters);
  const row = Number.parseInt(rowValue, 10);

  if (!column || !Number.isInteger(row) || row < 1) {
    return null;
  }

  return { column, row };
}

export function parseA1Range(value: string): ParsedA1Range | null {
  const match = value.match(A1_RANGE_PATTERN);
  if (!match) {
    return null;
  }

  const [, startColumnLetters, startRowValue, endColumnLetters, endRowValue] = match;
  const start = parseA1Cell(`${startColumnLetters}${startRowValue}`);
  if (!start) {
    return null;
  }

  const end = endColumnLetters && endRowValue
    ? parseA1Cell(`${endColumnLetters}${endRowValue}`)
    : start;

  if (!end || end.column < start.column || end.row < start.row) {
    return null;
  }

  return {
    column: start.column,
    row: start.row,
    endColumn: end.column,
    endRow: end.row,
    rows: end.row - start.row + 1,
    columns: end.column - start.column + 1
  };
}

export function matrixShape(matrix: unknown[][]): RectangleShape {
  const rows = matrix.length;
  const columns = rows === 0 ? 0 : matrix[0]?.length ?? 0;
  return { rows, columns };
}

export function validateRectangularMatrix(
  matrix: unknown[][] | undefined,
  ctx: RefinementCtx,
  field: string
): void {
  if (matrix === undefined) {
    return;
  }

  const expectedColumns = matrix[0]?.length ?? 0;

  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} must be a 2D array.`,
        path: [field, rowIndex]
      });
      return;
    }

    if (row.length !== expectedColumns) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${field} must be rectangular.`,
        path: [field, rowIndex]
      });
    }
  });
}

export function validateTargetRangeMatchesShape(
  targetRange: string,
  shape: RectangleShape,
  ctx: RefinementCtx,
  field = "targetRange"
): void {
  const parsed = parseA1Range(targetRange);

  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must be a valid A1 range.`,
      path: [field]
    });
    return;
  }

  if (parsed.rows !== shape.rows || parsed.columns !== shape.columns) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must describe the full ${shape.rows}x${shape.columns} destination rectangle.`,
      path: [field]
    });
  }
}
