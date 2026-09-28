// src/background/index.ts
// The "brain" — persistent-ish MV3 service worker. Owns LLM routing and
// message dispatch. Phase 1: summarize + Q&A only, no action execution.

import { isBlockedUrl } from "./sensitiveGuard";
import { routeToLLM } from "./llmRouter";

type SummarizeRequest = {
  type: "SUMMARIZE_PAGE";
  url: string;
  extractedText: string;
};

type AskRequest = {
  type: "ASK_QUESTION";
  url: string;
  extractedText: string;
  question: string;
};

type InboundMessage = SummarizeRequest | AskRequest;

const MAX_CONTENT_CHARS = 4000;

function truncateContent(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CONTENT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_CONTENT_CHARS), truncated: true };
}

async function isLocalOnlyMode(): Promise<boolean> {
  const { localOnlyMode } = await chrome.storage.local.get("localOnlyMode");
  return Boolean(localOnlyMode);
}

chrome.runtime.onMessage.addListener((message: InboundMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err) }));
  return true;
});

async function handleMessage(message: InboundMessage) {
  const localOnly = await isLocalOnlyMode();
  const matchesBlocklist = isBlockedUrl(message.url); // still logged either way — FR20

  // FR19: local-only mode is the explicit user override that lets a
  // blocklisted page through. Without this check, the guard block was
  // unconditional and local-only mode had no effect — that was the bug.
  if (matchesBlocklist && !localOnly) {
    return {
      blocked: true,
      reason:
        "This page matches the sensitive-page blocklist (payment/billing/checkout). Enable local-only mode to proceed.",
    };
  }

  const { text: trimmedText, truncated } = truncateContent(message.extractedText);
  const safeContent = `<untrusted_page_content>\n${trimmedText}\n</untrusted_page_content>`;

  if (message.type === "SUMMARIZE_PAGE") {
    const result = await routeToLLM({ task: "summarize", content: safeContent });
    return { blocked: false, result, truncated };
  }

  if (message.type === "ASK_QUESTION") {
    const result = await routeToLLM({
      task: "qa",
      content: safeContent,
      question: message.question,
    });
    return { blocked: false, result, truncated };
  }

  return { error: "Unknown message type" };
}
