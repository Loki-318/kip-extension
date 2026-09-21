// src/popup/App.tsx
// Minimal chat UI: summarize button + free-text Q&A. Voice input and
// action execution are deliberately out of scope for this component
// until Phases 2 and 4.

import { useState } from "react";

type ChatTurn = { role: "user" | "assistant"; text: string };

export default function App() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  async function getActiveTabContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error("No active tab found");
    const content = await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT_PAGE_CONTENT",
    });
    return content as { title: string; text: string; url: string };
  }

  async function handleSummarize() {
    setLoading(true);
    setBlockedNotice(null);
    try {
      const page = await getActiveTabContent();
      const response = await chrome.runtime.sendMessage({
        type: "SUMMARIZE_PAGE",
        url: page.url,
        extractedText: page.text,
      });

      if (response.blocked) {
        setBlockedNotice(response.reason);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: response.result.text },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setBlockedNotice(null);
    const askedQuestion = question;
    setQuestion("");
    setTurns((prev) => [...prev, { role: "user", text: askedQuestion }]);

    try {
      const page = await getActiveTabContent();
      const response = await chrome.runtime.sendMessage({
        type: "ASK_QUESTION",
        url: page.url,
        extractedText: page.text,
        question: askedQuestion,
      });

      if (response.blocked) {
        setBlockedNotice(response.reason);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: response.result.text },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: 340, padding: 12, fontFamily: "system-ui" }}>
      <h2 style={{ margin: "0 0 8px" }}>Kip</h2>

      <button onClick={handleSummarize} disabled={loading}>
        Summarize this page
      </button>

      {blockedNotice && (
        <p style={{ color: "#b00020", fontSize: 13 }}>{blockedNotice}</p>
      )}

      <div style={{ maxHeight: 220, overflowY: "auto", margin: "8px 0" }}>
        {turns.map((turn, i) => (
          <p key={i} style={{ fontSize: 13 }}>
            <strong>{turn.role === "user" ? "You" : "Kip"}:</strong> {turn.text}
          </p>
        ))}
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAsk()}
        placeholder="Ask about this page..."
        style={{ width: "100%", boxSizing: "border-box" }}
        disabled={loading}
      />
    </div>
  );
}
