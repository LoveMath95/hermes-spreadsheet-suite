import type {
  CompositeUpdateData,
  DryRunResult,
  PlanHistoryEntry,
  PlanHistoryPage,
  RedoRequest,
  UndoRequest
} from "@hermes/contracts";

export class StaleExecutionError extends Error {}

export class UnsupportedExecutionControlError extends Error {}

export class FreshDryRunRequiredError extends Error {}

type HistoryRecord = {
  workbookSessionKey: string;
  entry: PlanHistoryEntry;
};

type ExecutionLedgerOptions = {
  maxHistoryEntriesPerWorkbook?: number;
  maxDryRuns?: number;
  now?: () => number;
};

export class ExecutionLedger {
  private readonly history = new Map<string, PlanHistoryEntry[]>();
  private readonly historyByExecutionId = new Map<string, HistoryRecord>();
  private readonly dryRuns = new Map<string, DryRunResult>();
  private readonly maxHistoryEntriesPerWorkbook: number;
  private readonly maxDryRuns: number;
  private readonly now: () => number;

  constructor(options: ExecutionLedgerOptions = {}) {
    this.maxHistoryEntriesPerWorkbook = Math.max(1, options.maxHistoryEntriesPerWorkbook ?? 500);
    this.maxDryRuns = Math.max(1, options.maxDryRuns ?? 500);
    this.now = options.now ?? (() => Date.now());
  }

  nowMs(): number {
    return this.now();
  }

  isoTimestamp(offsetMs = 0): string {
    return new Date(this.now() + offsetMs).toISOString();
  }

  private pruneExpiredDryRuns(): void {
    for (const [key, result] of this.dryRuns.entries()) {
      if (Date.parse(result.expiresAt) <= this.now()) {
        this.dryRuns.delete(key);
      }
    }
  }

  private evictOverflowDryRuns(): void {
    while (this.dryRuns.size > this.maxDryRuns) {
      const oldestKey = this.dryRuns.keys().next().value;
      if (!oldestKey) {
        return;
      }

      this.dryRuns.delete(oldestKey);
    }
  }

  private pruneWorkbookHistory(
    workbookSessionKey: string,
    bucket: PlanHistoryEntry[]
  ): PlanHistoryEntry[] {
    if (bucket.length <= this.maxHistoryEntriesPerWorkbook) {
      return bucket;
    }

    const retained = [...bucket]
      .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
      .slice(-this.maxHistoryEntriesPerWorkbook);
    const retainedIds = new Set(retained.map((entry) => entry.executionId));

    for (const entry of bucket) {
      if (!retainedIds.has(entry.executionId)) {
        this.historyByExecutionId.delete(this.getExecutionKey(workbookSessionKey, entry.executionId));
      }
    }

    return retained;
  }

  listHistory(workbookSessionKey: string, limit?: number, cursor?: string): PlanHistoryPage {
    const entries = [...(this.history.get(workbookSessionKey) ?? [])]
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));

    const startIndex = this.parseCursor(cursor);
    const pageSize = typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.min(limit, 100))
      : entries.length;

    const pageEntries = entries.slice(startIndex, startIndex + pageSize);
    const nextCursor = startIndex + pageSize < entries.length
      ? String(startIndex + pageSize)
      : undefined;

    return nextCursor
      ? { entries: pageEntries, nextCursor }
      : { entries: pageEntries };
  }

  recordApproved(input: { workbookSessionKey: string } & PlanHistoryEntry): void {
    this.upsertHistoryEntry(input);
  }

  recordCompleted(input: { workbookSessionKey: string } & PlanHistoryEntry): void {
    this.upsertHistoryEntry(input);
  }

  assertFreshDryRun(input: {
    workbookSessionKey: string;
    planDigest: string;
    required: boolean;
  }): void {
    if (!input.required) {
      return;
    }

    const result = this.getDryRun(input.workbookSessionKey, input.planDigest);
    if (!result || !result.simulated || Date.parse(result.expiresAt) <= this.now()) {
      throw new FreshDryRunRequiredError("Required dry-run is missing, stale, or unusable.");
    }
  }

  private upsertHistoryEntry(input: { workbookSessionKey: string } & PlanHistoryEntry): void {
    const { workbookSessionKey, ...entry } = input;
    const bucket = this.history.get(input.workbookSessionKey) ?? [];
    const existingIndex = bucket.findIndex(
      (candidate) => candidate.executionId === entry.executionId
    );
    if (existingIndex >= 0) {
      bucket[existingIndex] = entry;
    } else {
      bucket.push(entry);
    }
    this.history.set(workbookSessionKey, this.pruneWorkbookHistory(workbookSessionKey, bucket));
    this.historyByExecutionId.set(this.getExecutionKey(workbookSessionKey, input.executionId), {
      workbookSessionKey,
      entry
    });
  }

  storeDryRun(result: DryRunResult): void {
    this.pruneExpiredDryRuns();
    this.dryRuns.set(this.getDryRunKey(result.workbookSessionKey, result.planDigest), result);
    this.evictOverflowDryRuns();
  }

  getDryRun(workbookSessionKey: string, planDigest: string): DryRunResult | undefined {
    this.pruneExpiredDryRuns();
    return this.dryRuns.get(this.getDryRunKey(workbookSessionKey, planDigest));
  }

  undoExecution(request: UndoRequest): CompositeUpdateData {
    const record = this.historyByExecutionId.get(
      this.getExecutionKey(request.workbookSessionKey, request.executionId)
    );
    if (
      !record
      || !record.entry.undoEligible
      || !record.entry.reversible
    ) {
      throw new StaleExecutionError("Undo target is missing, stale, or not reversible.");
    }

    const timestamp = this.isoTimestamp();
    const summary = `Undid execution ${record.entry.executionId}.`;
    const executionId = this.buildControlExecutionId("undo", request.requestId, record.entry.executionId);

    this.upsertHistoryEntry({
      workbookSessionKey: record.workbookSessionKey,
      ...record.entry,
      undoEligible: false,
      redoEligible: false
    });

    this.upsertHistoryEntry({
      workbookSessionKey: record.workbookSessionKey,
      executionId,
      requestId: request.requestId,
      runId: this.buildControlRunId("undo", request.requestId),
      planType: "undo_request",
      planDigest: this.buildControlPlanDigest("undo", record.entry.planDigest),
      status: "undone",
      timestamp,
      reversible: true,
      undoEligible: false,
      redoEligible: true,
      summary,
      linkedExecutionId: record.entry.executionId
    });

    return {
      operation: "composite_update",
      executionId,
      stepResults: [
        {
          stepId: `undo_${record.entry.executionId}`.slice(0, 128),
          status: "completed",
          summary
        }
      ],
      summary
    };
  }

  redoExecution(request: RedoRequest): CompositeUpdateData {
    const record = this.historyByExecutionId.get(
      this.getExecutionKey(request.workbookSessionKey, request.executionId)
    );
    if (
      !record
      || !record.entry.redoEligible
      || !record.entry.reversible
      || record.entry.status !== "undone"
    ) {
      throw new StaleExecutionError("Redo target is missing, stale, or not reversible.");
    }

    const timestamp = this.isoTimestamp();
    const summary = `Redid execution ${record.entry.executionId}.`;
    const executionId = this.buildControlExecutionId("redo", request.requestId, record.entry.executionId);

    this.upsertHistoryEntry({
      workbookSessionKey: record.workbookSessionKey,
      ...record.entry,
      undoEligible: false,
      redoEligible: false
    });

    this.upsertHistoryEntry({
      workbookSessionKey: record.workbookSessionKey,
      executionId,
      requestId: request.requestId,
      runId: this.buildControlRunId("redo", request.requestId),
      planType: "redo_request",
      planDigest: this.buildControlPlanDigest("redo", record.entry.planDigest),
      status: "redone",
      timestamp,
      reversible: true,
      undoEligible: true,
      redoEligible: false,
      summary,
      linkedExecutionId: record.entry.executionId
    });

    return {
      operation: "composite_update",
      executionId,
      stepResults: [
        {
          stepId: `redo_${record.entry.executionId}`.slice(0, 128),
          status: "completed",
          summary
        }
      ],
      summary
    };
  }

  private getDryRunKey(workbookSessionKey: string, planDigest: string): string {
    return `${workbookSessionKey}::${planDigest}`;
  }

  private getExecutionKey(workbookSessionKey: string, executionId: string): string {
    return `${workbookSessionKey}::${executionId}`;
  }

  private buildControlExecutionId(
    verb: "undo" | "redo",
    requestId: string,
    targetExecutionId: string
  ): string {
    return `exec_${verb}_${this.now()}_${requestId}_${targetExecutionId}`.slice(0, 128);
  }

  private buildControlRunId(verb: "undo" | "redo", requestId: string): string {
    return `run_${verb}_${requestId}`.slice(0, 128);
  }

  private buildControlPlanDigest(verb: "undo" | "redo", planDigest: string): string {
    return `${verb}::${planDigest}`.slice(0, 256);
  }

  private parseCursor(cursor?: string): number {
    if (cursor === undefined) {
      return 0;
    }

    if (!/^(0|[1-9]\d*)$/.test(cursor)) {
      throw new Error("History cursor must be a non-negative integer.");
    }

    return Number(cursor);
  }
}
