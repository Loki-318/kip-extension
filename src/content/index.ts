// src/content/index.ts
// IMPORTANT: this import must be first, before any other code runs.
// CRXJS injects its own (incompletely-initialized) custom-elements
// polyfill into content scripts during `npm run dev` to support the
// Vite HMR error overlay. That polyfill patches Node.prototype.cloneNode
// globally and throws "Cannot read properties of null (reading
// '__CE_registry')" on ANY cloneNode call in this realm — including
// ones inside @mozilla/readability's own internals — because the
// registry never gets properly set up. Importing the real polyfill
// ourselves, first, initializes it correctly and avoids the crash.
// This only matters in dev mode; production builds (`npm run build`)
// don't inject CRXJS's broken version at all.
// See: https://github.com/crxjs/chrome-extension-tools/issues/803
import "@webcomponents/custom-elements";

import { Readability } from "@mozilla/readability";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_PAGE_CONTENT") {
    sendResponse(extractReadableContent());
  }
  return true;
});

function extractReadableContent(): { title: string; text: string; url: string } {
  let article: ReturnType<Readability["parse"]> = null;

  try {
    const html = document.documentElement.outerHTML;
    const parsedDoc = new DOMParser().parseFromString(html, "text/html");
    article = new Readability(parsedDoc).parse();
  } catch (err) {
    console.warn("[Kip] Readability parse failed, falling back to raw text:", err);
  }

  return {
    title: article?.title ?? document.title,
    text: article?.textContent?.trim() ?? document.body.innerText.slice(0, 20000),
    url: window.location.href,
  };
}
