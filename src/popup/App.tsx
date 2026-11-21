// src/popup/App.tsx
import { useState } from "react";

type ChatTurn = { role: "user" | "assistant"; text: string };
type PageContent = { title: string; text: string; url: string };
type AccessResponse = { blocked?: boolean; reason?: string; error?: string };
const MAX_CONTEXT_TURNS = 6;
const MAX_CONTEXT_CHARS_PER_TURN = 800;

export default function App() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error("No active tab found");
    return tab;
  }

  async function checkActiveTabAccess(tab: chrome.tabs.Tab) {
    const response = (await chrome.runtime.sendMessage({
      type: "CHECK_PAGE_ACCESS",
      url: tab.url ?? "",
    })) as AccessResponse;
    if (response?.error) throw new Error(response.error);
    if (response?.blocked) {
      setBlockedNotice(response.reason ?? "This page cannot be processed.");
      return false;
    }
    return true;
  }

  async function getActiveTabContent(tab: chrome.tabs.Tab): Promise<PageContent> {
    if (!tab.id) throw new Error("No active tab found");
    const content = await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT_PAGE_CONTENT",
    });
    return content as PageContent;
  }

  function getConversationContext(): ChatTurn[] {
    return turns.slice(-MAX_CONTEXT_TURNS).map((turn) => ({
      role: turn.role,
      text: turn.text.slice(0, MAX_CONTEXT_CHARS_PER_TURN),
    }));
  }

  function handleBackgroundResponse(response: any) {
    if (!response) {
      setErrorNotice("No response from the extension background worker.");
      return;
    }
    if (response.error) {
      setErrorNotice(response.error);
      return;
    }
    if (response.blocked) {
      setBlockedNotice(response.reason);
      return;
    }
    if (response.result?.text) {
      const prefix = response.truncated
        ? `[${response.result.provider}, page truncated to fit token limit] `
        : `[${response.result.provider}] `;
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: prefix + response.result.text },
      ]);
      return;
    }
    setErrorNotice("Received an unexpected response shape from the background worker.");
  }

  async function handleSummarize() {
    setLoading(true);
    setBlockedNotice(null);
    setErrorNotice(null);
    try {
      const tab = await getActiveTab();
      if (!(await checkActiveTabAccess(tab))) return;
      const page = await getActiveTabContent(tab);
      const response = await chrome.runtime.sendMessage({
        type: "SUMMARIZE_PAGE",
        url: page.url,
        extractedText: page.text,
      });
      handleBackgroundResponse(response);
    } catch (err) {
      setErrorNotice(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk() {
    await askQuestion(question);
  }

  async function askQuestion(rawQuestion: string) {
    if (!rawQuestion.trim()) return;
    setLoading(true);
    setBlockedNotice(null);
    setErrorNotice(null);
    const askedQuestion = rawQuestion.trim();
    setQuestion("");
    const conversation = getConversationContext();

    try {
      const tab = await getActiveTab();
      if (!(await checkActiveTabAccess(tab))) return;
      setTurns((prev) => [...prev, { role: "user", text: askedQuestion }]);
      const page = await getActiveTabContent(tab);
      const response = await chrome.runtime.sendMessage({
        type: "ASK_QUESTION",
        url: page.url,
        extractedText: page.text,
        question: askedQuestion,
        conversation,
      });
      handleBackgroundResponse(response);
    } catch (err) {
      setErrorNotice(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: 340, padding: 12, fontFamily: "system-ui" }}>
      <h2 style={{ margin: "0 0 8px" }}>Kip</h2>

      <button onClick={handleSummarize} disabled={loading}>
        {loading ? "Working..." : "Summarize this page"}
      </button>

      {blockedNotice && (
        <p style={{ color: "#b00020", fontSize: 13 }}>{blockedNotice}</p>
      )}
      {errorNotice && (
        <p style={{ color: "#b00020", fontSize: 13, whiteSpace: "pre-wrap" }}>⚠ {errorNotice}</p>
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