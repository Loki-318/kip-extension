// src/content/index.ts
// Runs inside the actual page. Phase 1 job: extract readable content on
// request from the popup. No accessibility-tree/action-grounding logic
// here yet — that's Phase 4.

import { Readability } from "@mozilla/readability";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_PAGE_CONTENT") {
    sendResponse(extractReadableContent());
  }
  return true;
});

function extractReadableContent(): { title: string; text: string; url: string } {
  // Readability mutates the DOM it's given, so clone the document first
  // to avoid visibly altering the page the user is looking at.
  const clonedDoc = document.cloneNode(true) as Document;
  const article = new Readability(clonedDoc).parse();

  return {
    title: article?.title ?? document.title,
    text: article?.textContent?.trim() ?? document.body.innerText.slice(0, 20000),
    url: window.location.href,
  };
}
