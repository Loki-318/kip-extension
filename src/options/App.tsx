// src/options/App.tsx
// Settings: API keys, local-only mode toggle, blocklist viewer (FR22-FR24).
// Keys are stored in chrome.storage.local only — never synced, never
// bundled into source or committed to the repo.

import { useEffect, useState } from "react";

export default function App() {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guardLog, setGuardLog] = useState<
    { url: string; blocked: boolean; timestamp: number }[]
  >([]);

  useEffect(() => {
    chrome.storage.local
      .get(["groqApiKey", "githubToken", "localOnlyMode", "guardLog"])
      .then((stored) => {
        setGroqApiKey(stored.groqApiKey ?? "");
        setGithubToken(stored.githubToken ?? "");
        setLocalOnlyMode(Boolean(stored.localOnlyMode));
        setGuardLog(stored.guardLog ?? []);
      });
  }, []);

  async function handleSave() {
    await chrome.storage.local.set({ groqApiKey, githubToken, localOnlyMode });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleClearLog() {
    await chrome.storage.local.set({ guardLog: [] });
    setGuardLog([]);
  }

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", fontFamily: "system-ui" }}>
      <h1>Kip Settings</h1>

      <section style={{ marginBottom: 20 }}>
        <h3>API Keys</h3>
        <label style={{ display: "block", marginBottom: 8 }}>
          Groq API Key
          <input
            type="password"
            value={groqApiKey}
            onChange={(e) => setGroqApiKey(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </label>
        <label style={{ display: "block" }}>
          GitHub Models Token
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </label>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h3>Privacy</h3>
        <label>
          <input
            type="checkbox"
            checked={localOnlyMode}
            onChange={(e) => setLocalOnlyMode(e.target.checked)}
          />
          {" "}Local-only mode (routes everything to Ollama, no cloud calls)
        </label>
      </section>

      <button onClick={handleSave}>Save</button>
      {saved && <span style={{ marginLeft: 8, color: "green" }}>Saved.</span>}

      <section style={{ marginTop: 28 }}>
        <h3>Sensitive-Page Guard Log</h3>
        <button onClick={handleClearLog} style={{ marginBottom: 8 }}>
          Clear log
        </button>
        <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 12 }}>
          {guardLog.length === 0 && <p>No entries yet.</p>}
          {guardLog.map((entry, i) => (
            <div key={i} style={{ color: entry.blocked ? "#b00020" : "#555" }}>
              [{new Date(entry.timestamp).toLocaleTimeString()}]{" "}
              {entry.blocked ? "BLOCKED" : "allowed"} — {entry.url}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
