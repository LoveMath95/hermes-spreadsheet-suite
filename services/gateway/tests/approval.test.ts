import { describe, expect, it } from "vitest";
import { createApprovalToken, verifyApprovalToken } from "../src/lib/approval.ts";

describe("write-back approval tokens", () => {
  it("signs and verifies a request-bound write approval", () => {
    const secret = "demo-secret";
    const token = createApprovalToken({
      requestId: "req_123",
      runId: "run_123",
      planDigest: "digest_123",
      issuedAt: "2026-04-19T09:30:00.000Z",
      secret
    });

    const verified = verifyApprovalToken({
      token,
      requestId: "req_123",
      runId: "run_123",
      planDigest: "digest_123",
      secret
    });

    expect(verified.valid).toBe(true);
  });

  it("rejects a token when the write plan digest changes", () => {
    const secret = "demo-secret";
    const token = createApprovalToken({
      requestId: "req_123",
      runId: "run_123",
      planDigest: "digest_123",
      issuedAt: "2026-04-19T09:30:00.000Z",
      secret
    });

    const verified = verifyApprovalToken({
      token,
      requestId: "req_123",
      runId: "run_123",
      planDigest: "digest_other",
      secret
    });

    expect(verified.valid).toBe(false);
  });

  it("rejects a token when it is older than the allowed approval TTL", () => {
    const secret = "demo-secret";
    const issuedAt = "2026-04-19T09:30:00.000Z";
    const token = createApprovalToken({
      requestId: "req_123",
      runId: "run_123",
      planDigest: "digest_123",
      issuedAt,
      secret
    });

    const verified = verifyApprovalToken({
      token,
      requestId: "req_123",
      runId: "run_123",
      planDigest: "digest_123",
      secret,
      maxAgeMs: 60_000,
      nowMs: Date.parse("2026-04-19T09:32:00.000Z")
    });

    expect(verified.valid).toBe(false);
    expect(verified.expired).toBe(true);
  });
});
