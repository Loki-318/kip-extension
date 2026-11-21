// src/background/index.ts
// The "brain" — persistent-ish MV3 service worker. Owns LLM routing and
// message dispatch. Phase 1: summarize + Q&A only, no action execution.

import { isBlockedUrl } from "./sensitiveGuard";
import { routeToLLM } from "./llmRouter";
import type { ConversationTurn } from "./llmRouter";

type CheckPageAccessRequest = {
  type: "CHECK_PAGE_ACCESS";
  url: string;
};

type SummarizeRequest = {
  type: "SUMMARIZE_PAGE";
  url: string;
  extractedText: string;
  conversation?: ConversationTurn[];
};

type AskRequest = {
  type: "ASK_QUESTION";
  url: string;
  extractedText: string;
  question: string;
  conversation?: ConversationTurn[];
};

type InboundMessage =
  | CheckPageAccessRequest
  | SummarizeRequest
  | AskRequest;

const MAX_CONTENT_CHARS = 4000;

function truncateContent(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CONTENT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_CONTENT_CHARS), truncated: true };
}

chrome.runtime.onMessage.addListener((message: InboundMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err) }));
  return true;
});

async function handleMessage(message: InboundMessage) {
  const matchesBlocklist = isBlockedUrl(message.url); // still logged either way — FR20

  // Groq is the only active provider in Phase 1, so sensitive pages remain
  // blocked until the local Ollama provider is deliberately re-enabled.
  if (matchesBlocklist) {
    return {
      blocked: true,
      reason:
        "This page matches the sensitive-page blocklist (payment/billing/checkout). Local processing is not available yet.",
    };
  }

  if (message.type === "CHECK_PAGE_ACCESS") {
    return { blocked: false };
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
      conversation: message.conversation,
    });
    return { blocked: false, result, truncated };
  }

  return { error: "Unknown message type" };
}
