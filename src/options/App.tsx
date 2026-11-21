// src/options/App.tsx
// Settings: Groq API key and blocklist viewer.
// Keys are stored in chrome.storage.local only — never synced, never
// bundled into source or committed to the repo.

import { useEffect, useState } from "react";

export default function App() {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [guardLog, setGuardLog] = useState<
    { url: string; blocked: boolean; timestamp: number }[]
  >([]);

  useEffect(() => {
    chrome.storage.local
      .get(["groqApiKey", "guardLog"])
      .then((stored) => {
        setGroqApiKey(stored.groqApiKey ?? "");
        setGuardLog(stored.guardLog ?? []);
      });
  }, []);

  async function handleSave() {
    await chrome.storage.local.set({ groqApiKey });
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
