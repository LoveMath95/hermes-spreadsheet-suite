import express from "express";

type InvokePayload = {
  runId: string;
  requestId: string;
  userMessage: string;
  context: {
    activeSheet: string;
    selectionA1: string;
    values: Array<Array<string | number | boolean | null>>;
  };
};

function inferHeaders(values: InvokePayload["context"]["values"]): string[] {
  const firstRow = values[0] ?? [];
  if (firstRow.every((cell) => typeof cell === "string")) {
    return firstRow.map((cell) => String(cell));
  }

  return firstRow.map((_cell, index) => `Column ${index + 1}`);
}

function pickNumericColumn(values: InvokePayload["context"]["values"]): number {
  const dataRows = values.slice(1);
  for (let columnIndex = 0; columnIndex < (values[0]?.length ?? 0); columnIndex += 1) {
    const allNumeric = dataRows.every((row) =>
      typeof row[columnIndex] === "number" || row[columnIndex] === null
    );
    if (allNumeric) {
      return columnIndex;
    }
  }

  return 0;
}

function toExcelColumn(index: number): string {
  let value = index + 1;
  let output = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
}

function explainSelection(payload: InvokePayload) {
  const rowCount = payload.context.values.length;
  const columnCount = payload.context.values[0]?.length ?? 0;
  const headers = inferHeaders(payload.context.values);

  if (/formula|sum|average|total/i.test(payload.userMessage)) {
    const numericColumn = pickNumericColumn(payload.context.values);
    const columnLetter = toExcelColumn(numericColumn);
    const formula = rowCount > 1
      ? `=SUM(${columnLetter}2:${columnLetter}${rowCount})`
      : `=SUM(${columnLetter}:${columnLetter})`;

    return {
      type: "formula" as const,
      message: [
        `I processed ${payload.context.selectionA1} on ${payload.context.activeSheet}.`,
        `The range looks like ${rowCount} rows by ${columnCount} columns.`,
        `A reasonable starting formula is \`${formula}\` for the numeric column "${headers[numericColumn] ?? columnLetter}".`
      ].join(" "),
      provider: "selection-sidecar-demo",
      skillName: "SelectionExplainerSkill"
    };
  }

  return {
    type: "chat" as const,
    message: [
      `I processed ${payload.context.selectionA1} on ${payload.context.activeSheet}.`,
      `The selection contains ${rowCount} rows and ${columnCount} columns.`,
      `Detected headers: ${headers.join(", ")}.`
    ].join(" "),
    provider: "selection-sidecar-demo",
    skillName: "SelectionExplainerSkill"
  };
}

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, skill: "SelectionExplainerSkill" });
});

app.post("/invoke", (req, res) => {
  const payload = req.body as InvokePayload;
  res.json(explainSelection(payload));
});

const port = Number(process.env.PORT ?? 8791);
app.listen(port, () => {
  console.log(`[selection-skill] listening on ${port}`);
});
