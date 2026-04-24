import { HermesRequestSchema } from "@hermes/contracts";
import type {
  ConversationMessage,
  HermesRequest,
  SpreadsheetContext
} from "@hermes/contracts";

const MAX_REQUEST_MESSAGE_LENGTH = 16_000;
const MAX_CONVERSATION_MESSAGES = 50;
const TRUNCATION_SUFFIX = "...";

function generateClientUuid(): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  if (cryptoObject && typeof cryptoObject.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoObject.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function createRequestId(): string {
  return `req_${generateClientUuid()}`;
}

function truncateRequestText(value: string): string {
  if (value.length <= MAX_REQUEST_MESSAGE_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_REQUEST_MESSAGE_LENGTH - TRUNCATION_SUFFIX.length)}${TRUNCATION_SUFFIX}`;
}

export function sanitizeConversation(
  conversation: ConversationMessage[]
): ConversationMessage[] {
  return conversation
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: truncateRequestText(message.content)
    }))
    .slice(-MAX_CONVERSATION_MESSAGES);
}

export function buildHermesRequest(input: {
  requestId?: string;
  source: HermesRequest["source"];
  host: HermesRequest["host"];
  userMessage: string;
  conversation: ConversationMessage[];
  context: SpreadsheetContext;
  capabilities: HermesRequest["capabilities"];
  reviewer: HermesRequest["reviewer"];
  confirmation: HermesRequest["confirmation"];
}): HermesRequest {
  return HermesRequestSchema.parse({
    schemaVersion: "1.0.0",
    requestId: input.requestId ?? createRequestId(),
    source: input.source,
    host: input.host,
    userMessage: truncateRequestText(input.userMessage),
    conversation: sanitizeConversation(input.conversation),
    context: input.context,
    capabilities: input.capabilities,
    reviewer: input.reviewer,
    confirmation: input.confirmation
  });
}
