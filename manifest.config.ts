import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

// Manifest V3 config, consumed by @crxjs/vite-plugin at build time.
// Phase 1 scope only: activeTab + scripting + storage.
// Do NOT add "downloads", "cookies", "webRequest", or "<all_urls>" host
// permissions yet — those get added deliberately in later phases, each
// tied to a specific requirement (see requirements doc Section 10, SR5-SR9).
export default defineManifest({
  manifest_version: 3,
  name: "Kip",
  description:
    "Reads, summarizes, and answers questions about the page you're on — on command, text or voice.",
  version: pkg.version,
  // icons: {
  //   16: "public/icon16.png",
  //   48: "public/icon48.png",
  //   128: "public/icon128.png",
  // },
  action: {
    default_popup: "src/popup/index.html",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: ["activeTab", "scripting", "storage"],
  // host_permissions intentionally left empty in Phase 1.
  // We rely on activeTab (user-gesture-scoped) rather than broad host
  // access — narrower attack surface, and it's the honest permission
  // to request until action-execution (Phase 4) actually needs it.
  host_permissions: [],
});
