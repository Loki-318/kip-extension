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

chrome.runtime.onMessage.addListener((message: InboundMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err) }));
  // Required for async sendResponse in MV3 service workers.
  return true;
});

async function handleMessage(message: InboundMessage) {
  if (isBlockedUrl(message.url)) {
    return {
      blocked: true,
      reason:
        "This page matches the sensitive-page blocklist (payment/billing/checkout). Enable local-only mode to proceed.",
    };
  }

  // Wrap untrusted page content in explicit delimiters before it ever
  // reaches a prompt template — see requirements addendum SR1/SR2.
  const safeContent = `<untrusted_page_content>\n${message.extractedText}\n</untrusted_page_content>`;

  if (message.type === "SUMMARIZE_PAGE") {
    const result = await routeToLLM({
      task: "summarize",
      content: safeContent,
    });
    return { blocked: false, result };
  }

  if (message.type === "ASK_QUESTION") {
    const result = await routeToLLM({
      task: "qa",
      content: safeContent,
      question: message.question,
    });
    return { blocked: false, result };
  }

  return { error: "Unknown message type" };
}
