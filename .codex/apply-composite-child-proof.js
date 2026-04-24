const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function write(relPath, content) {
  fs.writeFileSync(path.join(root, relPath), content);
}

function replaceOnce(content, search, replacement, relPath) {
  const count = content.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`${relPath}: expected one match, found ${count}.`);
  }
  return content.replace(search, replacement);
}

function patch(relPath, edits) {
  let content = read(relPath);
  for (const [search, replacement] of edits) {
    content = replaceOnce(content, search, replacement, relPath);
  }
  write(relPath, content);
}

patch("packages/contracts/src/schemas.ts", [[
`const compositeStepResultSchema = strictObject({
  stepId: z.string().min(1).max(128),
  status: z.enum(["completed", "failed", "skipped"]),
  summary: z.string().min(1).max(12000)
});`,
`const compositeStepResultSchema = strictObject({
  stepId: z.string().min(1).max(128),
  status: z.enum(["completed", "failed", "skipped"]),
  summary: z.string().min(1).max(12000),
  result: z.record(z.unknown()).optional()
});`
]]);

patch("services/gateway/src/routes/writeback.ts", [
[
`const CompletionRequestSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  workbookSessionKey: z.string().min(1).max(256).optional(),
  approvalToken: z.string().min(1),
  planDigest: z.string().min(1),
  result: z.union([
    RangeWritebackResultSchema,
    RangeFormatWritebackResultSchema,
    WorkbookStructureWritebackResultSchema,
    SheetStructureWritebackResultSchema,
    RangeSortWritebackResultSchema,
    RangeFilterWritebackResultSchema,
    DataValidationWritebackResultSchema,
    ConditionalFormatWritebackResultSchema,
    NamedRangeWritebackResultSchema,
    RangeTransferWritebackResultSchema,
    DataCleanupWritebackResultSchema,
    AnalysisReportWritebackResultSchema,
    ExternalDataWritebackResultSchema,
    PivotTableWritebackResultSchema,
    ChartWritebackResultSchema,
    CompositeWritebackResultSchema
  ])
});`,
`const ChildCompletionResultSchema = z.union([
  RangeWritebackResultSchema,
  RangeFormatWritebackResultSchema,
  WorkbookStructureWritebackResultSchema,
  SheetStructureWritebackResultSchema,
  RangeSortWritebackResultSchema,
  RangeFilterWritebackResultSchema,
  DataValidationWritebackResultSchema,
  ConditionalFormatWritebackResultSchema,
  NamedRangeWritebackResultSchema,
  RangeTransferWritebackResultSchema,
  DataCleanupWritebackResultSchema,
  AnalysisReportWritebackResultSchema,
  ExternalDataWritebackResultSchema,
  PivotTableWritebackResultSchema,
  ChartWritebackResultSchema
]);

const CompletionResultSchema = z.union([
  ChildCompletionResultSchema,
  CompositeWritebackResultSchema
]);

const CompletionRequestSchema = z.object({
  requestId: z.string().min(1),
  runId: z.string().min(1),
  workbookSessionKey: z.string().min(1).max(256).optional(),
  approvalToken: z.string().min(1),
  planDigest: z.string().min(1),
  result: CompletionResultSchema
});`
],
[
`type ApprovalPlan = z.infer<typeof ApprovalRequestSchema>["plan"];
type CompletionResult = z.infer<typeof CompletionRequestSchema>["result"];
type MaterializedAnalysisReportPlan = Extract<AnalysisReportPlanData, { outputMode: "materialize_report" }>;`,
`type ApprovalPlan = z.infer<typeof ApprovalRequestSchema>["plan"];
type CompletionResult = z.infer<typeof CompletionRequestSchema>["result"];
type ChildCompletionResult = z.infer<typeof ChildCompletionResultSchema>;
type MaterializedAnalysisReportPlan = Extract<AnalysisReportPlanData, { outputMode: "materialize_report" }>;`
],
[
`function assertCompositeCompletionMatchesApprovedPlan(
  plan: CompositePlanData,
  result: z.infer<typeof CompositeWritebackResultSchema>
): void {`,
`const ApprovalPlanResponseTypeCandidates: Array<{
  type: HermesResponse["type"];
  schema: { safeParse: (input: unknown) => { success: boolean } };
}> = [
  { type: "sheet_import_plan", schema: SheetImportPlanDataSchema },
  { type: "sheet_update", schema: SheetUpdateDataSchema },
  { type: "external_data_plan", schema: ExternalDataPlanDataSchema },
  { type: "workbook_structure_update", schema: WorkbookStructureUpdateDataSchema },
  { type: "range_format_update", schema: RangeFormatUpdateDataSchema },
  { type: "conditional_format_plan", schema: ConditionalFormatPlanDataSchema },
  { type: "sheet_structure_update", schema: SheetStructureUpdateDataSchema },
  { type: "range_sort_plan", schema: RangeSortPlanDataSchema },
  { type: "range_filter_plan", schema: RangeFilterPlanDataSchema },
  { type: "data_validation_plan", schema: DataValidationPlanDataSchema },
  { type: "named_range_update", schema: NamedRangeUpdateDataSchema },
  { type: "range_transfer_plan", schema: RangeTransferPlanDataSchema },
  { type: "data_cleanup_plan", schema: DataCleanupPlanDataSchema },
  { type: "analysis_report_plan", schema: AnalysisReportPlanDataSchema },
  { type: "pivot_table_plan", schema: PivotTablePlanDataSchema },
  { type: "chart_plan", schema: ChartPlanDataSchema }
];

function getResponseTypeForApprovalPlan(plan: ApprovalPlan): HermesResponse["type"] | undefined {
  return ApprovalPlanResponseTypeCandidates.find((candidate) =>
    candidate.schema.safeParse(plan).success
  )?.type;
}

function assertChildCompletionMatchesApprovedPlan(
  plan: ApprovalPlan,
  result: ChildCompletionResult
): void {
  const responseType = getResponseTypeForApprovalPlan(plan);
  if (!responseType) {
    throw new Error("Writeback result does not match the approved plan details.");
  }

  const expectedResultKind = getExpectedResultKind({
    type: responseType,
    data: plan
  } as HermesResponse);
  if (!expectedResultKind || result.kind !== expectedResultKind) {
    throw new Error("Writeback result does not match the approved plan details.");
  }

  assertCompletionMatchesApprovedPlan({
    type: responseType,
    data: plan
  } as HermesResponse, result);
}

function assertCompositeCompletionMatchesApprovedPlan(
  plan: CompositePlanData,
  result: z.infer<typeof CompositeWritebackResultSchema>
): void {`
],
[
`      case "completed":
        completedSteps.add(stepResult.stepId);
        break;`,
`      case "completed":
        {
          const parsedChildResult = ChildCompletionResultSchema.safeParse(stepResult.result);
          if (!parsedChildResult.success) {
            throw new Error("Writeback result does not match the approved plan details.");
          }
          assertChildCompletionMatchesApprovedPlan(expectedStep.plan, parsedChildResult.data);
        }
        completedSteps.add(stepResult.stepId);
        break;`
]
]);

patch("apps/excel-addin/src/taskpane/taskpane.js", [[
`      stepResults.push({
        stepId: step.stepId,
        status: "completed",
        summary: getCompositeStepWritebackStatusLine(step.plan, result)
      });`,
`      stepResults.push({
        stepId: step.stepId,
        status: "completed",
        summary: getCompositeStepWritebackStatusLine(step.plan, result),
        result: stripLocalExecutionSnapshot(result)
      });`
]]);

patch("apps/google-sheets-addon/src/Code.gs", [
[
`function resolveExecutionCellSnapshot_(input) {
  if (!input || typeof input !== 'object') {`,
`function stripLocalExecutionSnapshot_(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return result;
  }

  const nextResult = {};
  Object.keys(result).forEach(function(key) {
    if (key !== '__hermesLocalExecutionSnapshot') {
      nextResult[key] = result[key];
    }
  });
  return nextResult;
}

function resolveExecutionCellSnapshot_(input) {
  if (!input || typeof input !== 'object') {`
],
[
`      stepResults.push({
        stepId: step.stepId,
        status: 'completed',
        summary: getCompositeStepWritebackStatusLine_(step.plan, result)
      });`,
`      stepResults.push({
        stepId: step.stepId,
        status: 'completed',
        summary: getCompositeStepWritebackStatusLine_(step.plan, result),
        result: stripLocalExecutionSnapshot_(result)
      });`
]
]);

patch("packages/contracts/tests/contracts.test.ts", [[
`          {
            stepId: "step_sort",
            status: "completed",
            summary: "Sorted Sales rows."
          }`,
`          {
            stepId: "step_sort",
            status: "completed",
            summary: "Sorted Sales rows.",
            result: {
              kind: "range_sort",
              hostPlatform: "excel_windows",
              targetSheet: "Sales",
              targetRange: "A1:F50",
              hasHeader: true,
              keys: [{ columnRef: "Revenue", direction: "desc" }],
              explanation: "Sort by revenue.",
              confidence: 0.91,
              requiresConfirmation: true,
              affectedRanges: ["Sales!A1:F50"],
              summary: "Sorted Sales rows."
            }
          }`
]]);

patch("services/gateway/tests/writebackFlow.test.ts", [
[
`            {
              stepId: "sort",
              status: "completed",
              summary: "Sorted Sales!A1:F50."
            },
            {
              stepId: "report",
              status: "completed",
              summary: "Created Sales Report!A1:D5."
            }`,
`            {
              stepId: "sort",
              status: "completed",
              summary: "Sorted Sales!A1:F50.",
              result: {
                kind: "range_sort",
                hostPlatform: "excel_windows",
                ...(plan.steps[0].plan as any),
                summary: "Sorted Sales!A1:F50."
              }
            },
            {
              stepId: "report",
              status: "completed",
              summary: "Created Sales Report!A1:D5.",
              result: {
                kind: "analysis_report_update",
                hostPlatform: "excel_windows",
                ...(plan.steps[1].plan as any),
                targetRange: "A1:D5",
                summary: "Created Sales Report!A1:D5."
              }
            }`
],
[
`  it("does not treat chat-only analysis reports as writeback eligible", () => {`,
`  it("rejects completed composite steps that omit child writeback proof", () => {
    const traceBus = new TraceBus();
    const plan = {
      steps: [
        {
          stepId: "write",
          dependsOn: [],
          continueOnError: false,
          plan: {
            targetSheet: "Sales",
            targetRange: "A1:B2",
            operation: "replace_range" as const,
            values: [[1, 2], [3, 4]],
            explanation: "Write the approved values.",
            confidence: 0.9,
            requiresConfirmation: true as const,
            overwriteRisk: "low" as const,
            shape: { rows: 2, columns: 2 }
          }
        }
      ],
      explanation: "Write values.",
      confidence: 0.9,
      requiresConfirmation: true as const,
      affectedRanges: ["Sales!A1:B2"],
      overwriteRisk: "low" as const,
      confirmationLevel: "standard" as const,
      reversible: true,
      dryRunRecommended: false,
      dryRunRequired: false
    };

    setRunResponse(traceBus, {
      runId: "run_composite_missing_child_proof",
      requestId: "req_composite_missing_child_proof",
      type: "composite_plan",
      traceEvent: "composite_plan_ready",
      plan
    });

    const approval = invokeWritebackRoute({
      traceBus,
      path: "/approve",
      body: {
        requestId: "req_composite_missing_child_proof",
        runId: "run_composite_missing_child_proof",
        plan
      }
    });
    expect(approval.status).toBe(200);

    const completion = invokeWritebackRoute({
      traceBus,
      path: "/complete",
      body: {
        requestId: "req_composite_missing_child_proof",
        runId: "run_composite_missing_child_proof",
        approvalToken: (approval.body as any).approvalToken,
        planDigest: (approval.body as any).planDigest,
        result: {
          kind: "composite_update",
          operation: "composite_update",
          hostPlatform: "excel_windows",
          executionId: (approval.body as any).executionId,
          stepResults: [
            {
              stepId: "write",
              status: "completed",
              summary: "Wrote Sales!A1:B2."
            }
          ],
          summary: "Completed the composite workflow."
        }
      }
    });

    expectRouteError(
      completion,
      409,
      "STALE_APPROVAL",
      "The approved update no longer matches the current Hermes plan."
    );
  });

  it("rejects composite child proof that does not match the approved step plan", () => {
    const traceBus = new TraceBus();
    const childPlan = {
      targetSheet: "Sales",
      targetRange: "A1:B2",
      operation: "replace_range" as const,
      values: [[1, 2], [3, 4]],
      explanation: "Write the approved values.",
      confidence: 0.9,
      requiresConfirmation: true as const,
      overwriteRisk: "low" as const,
      shape: { rows: 2, columns: 2 }
    };
    const plan = {
      steps: [
        {
          stepId: "write",
          dependsOn: [],
          continueOnError: false,
          plan: childPlan
        }
      ],
      explanation: "Write values.",
      confidence: 0.9,
      requiresConfirmation: true as const,
      affectedRanges: ["Sales!A1:B2"],
      overwriteRisk: "low" as const,
      confirmationLevel: "standard" as const,
      reversible: true,
      dryRunRecommended: false,
      dryRunRequired: false
    };

    setRunResponse(traceBus, {
      runId: "run_composite_bad_child_proof",
      requestId: "req_composite_bad_child_proof",
      type: "composite_plan",
      traceEvent: "composite_plan_ready",
      plan
    });

    const approval = invokeWritebackRoute({
      traceBus,
      path: "/approve",
      body: {
        requestId: "req_composite_bad_child_proof",
        runId: "run_composite_bad_child_proof",
        plan
      }
    });
    expect(approval.status).toBe(200);

    const completion = invokeWritebackRoute({
      traceBus,
      path: "/complete",
      body: {
        requestId: "req_composite_bad_child_proof",
        runId: "run_composite_bad_child_proof",
        approvalToken: (approval.body as any).approvalToken,
        planDigest: (approval.body as any).planDigest,
        result: {
          kind: "composite_update",
          operation: "composite_update",
          hostPlatform: "excel_windows",
          executionId: (approval.body as any).executionId,
          stepResults: [
            {
              stepId: "write",
              status: "completed",
              summary: "Wrote Sales!A1:B3.",
              result: buildRangeWriteResult({
                ...childPlan,
                targetRange: "A1:B3",
                values: [[1, 2], [3, 4], [5, 6]],
                shape: { rows: 3, columns: 2 }
              })
            }
          ],
          summary: "Completed the composite workflow."
        }
      }
    });

    expectRouteError(
      completion,
      409,
      "STALE_APPROVAL",
      "The approved update no longer matches the current Hermes plan."
    );
  });

  it("does not treat chat-only analysis reports as writeback eligible", () => {`
],
[
`            {
              stepId: "first",
              status: "completed",
              summary: "Created Stage 1."
            },
            {
              stepId: "second",
              status: "completed",
              summary: "Created Stage 2."
            }`,
`            {
              stepId: "first",
              status: "completed",
              summary: "Created Stage 1.",
              result: {
                kind: "workbook_structure_update",
                hostPlatform: "excel_windows",
                operation: "create_sheet",
                sheetName: "Stage 1",
                positionResolved: 1,
                sheetCount: 2,
                summary: "Created Stage 1."
              }
            },
            {
              stepId: "second",
              status: "completed",
              summary: "Created Stage 2.",
              result: {
                kind: "workbook_structure_update",
                hostPlatform: "excel_windows",
                operation: "create_sheet",
                sheetName: "Stage 2",
                positionResolved: 2,
                sheetCount: 3,
                summary: "Created Stage 2."
              }
            }`
]
]);

patch("services/gateway/tests/googleSheetsWave6Plans.test.ts", [[
`        {
          stepId: "step_pivot",
          status: "completed",
          summary: "Created pivot table on Sales Pivot!A1."
        },
        {
          stepId: "step_chart",
          status: "completed",
          summary: "Created line chart on Sales Chart!A1."
        }`,
`        {
          stepId: "step_pivot",
          status: "completed",
          summary: "Created pivot table on Sales Pivot!A1.",
          result: {
            kind: "pivot_table_update",
            hostPlatform: "google_sheets",
            targetSheet: "Sales Pivot",
            targetRange: "A1"
          }
        },
        {
          stepId: "step_chart",
          status: "completed",
          summary: "Created line chart on Sales Chart!A1.",
          result: {
            kind: "chart_update",
            hostPlatform: "google_sheets",
            targetSheet: "Sales Chart",
            targetRange: "A1",
            chartType: "line"
          }
        }`
]]);
