// src/background/sensitiveGuard.ts
// Rule-based blocklist (requirements doc FR18-FR20). Checked BEFORE any
// content extraction/LLM call is made. Extend this list as you find gaps
// — do not silently widen it without logging the decision (SR-style
// auditability from the addendum).

const BLOCKED_PATTERNS: RegExp[] = [
  /\/checkout/i,
  /\/billing/i,
  /\/payment/i,
  /\/pay(\/|$)/i,
  /\/cart(\/|$)/i,
  /\bstripe\.com\b/i,
  /\bpaypal\.com\b/i,
  /\brazorpay\.com\b/i,
  /\bcheckout\.\w+/i,
  /\bbank\w*\.(com|in|co)\b/i,
];

export function isBlockedUrl(url: string): boolean {
  const blocked = BLOCKED_PATTERNS.some((pattern) => pattern.test(url));
  logGuardDecision(url, blocked);
  return blocked;
}

async function logGuardDecision(url: string, blocked: boolean) {
  const { guardLog = [] } = await chrome.storage.local.get("guardLog");
  const entry = { url, blocked, timestamp: Date.now() };
  const updated = [entry, ...guardLog].slice(0, 500); // cap log size
  await chrome.storage.local.set({ guardLog: updated });
}
