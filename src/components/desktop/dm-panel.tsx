"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/desktop/avatar";
import { listAgents, type Agent } from "@/lib/agents/service";
import { executeDMTurn } from "@/lib/agents/execute";
import { writeFile, readFile, fileExists } from "@/lib/tauri/fs";
import { loadKeys } from "@/lib/ai/keys";

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

const COMPRESSION_THRESHOLD = 30;

export function DMPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      listAgents()
        .then(setAgents)
        .catch(() => setAgents([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedAgent) {
      setMessages([]);
      return;
    }
    (async () => {
      const path = activePath(selectedAgent);
      try {
        if (await fileExists(path)) {
          const raw = await readFile(path);
          setMessages(JSON.parse(raw));
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    })();
  }, [selectedAgent]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function activePath(agent: string) {
    const ws = typeof window !== "undefined" ? localStorage.getItem("bb_workspace_path") || "" : "";
    return `${ws}/agents/${agent}/conversations/active.json`;
  }
  function memoryPath(agent: string) {
    const ws = typeof window !== "undefined" ? localStorage.getItem("bb_workspace_path") || "" : "";
    return `${ws}/agents/${agent}/memory.md`;
  }
  function archivePath(agent: string) {
    const ws = typeof window !== "undefined" ? localStorage.getItem("bb_workspace_path") || "" : "";
    return `${ws}/agents/${agent}/conversations/archive-${Date.now()}.json`;
  }

  async function send() {
    if (!input.trim() || sending || !selectedAgent) return;
    const userMsg: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    const placeholder: Message = {
      role: "agent",
      content: "",
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMsg, placeholder];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const finalText = await executeDMTurn(
        selectedAgent,
        userMsg.content,
        (chunk) => {
          setMessages((prev) => {
            const arr = [...prev];
            const last = arr[arr.length - 1];
            if (last && last.role === "agent") {
              arr[arr.length - 1] = { ...last, content: last.content + chunk };
            }
            return arr;
          });
        },
      );
      const updated: Message[] = [
        ...next.slice(0, -1),
        { ...placeholder, content: finalText },
      ];
      setMessages(updated);
      try {
        await writeFile(activePath(selectedAgent), JSON.stringify(updated, null, 2));
      } catch {
        /* persist failure is non-fatal */
      }
    } catch (e: unknown) {
      setMessages((prev) => prev.slice(0, -1));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function compress() {
    if (!selectedAgent || compressing) return;
    if (messages.length <= 10) {
      setNotice("Nothing to compress yet — keep at least 10 recent messages.");
      return;
    }

    const allKeys = await loadKeys();
    const googleKey = allKeys.find((k) => k.provider === "google");
    const anthropicKey = allKeys.find((k) => k.provider === "anthropic");
    const picked = googleKey || anthropicKey;
    if (!picked) {
      setError("API key required to compress. Add a Google or Anthropic key in Settings.");
      return;
    }
    const provider: "google" | "anthropic" = picked.provider as "google" | "anthropic";
    const apiKey = picked.key;

    setCompressing(true);
    setError(null);
    try {
      const old = messages.slice(0, -10);
      const recent = messages.slice(-10);
      const transcript = old.map((m) => `${m.role}: ${m.content}`).join("\n\n");
      const summary = await summarize(transcript, apiKey, provider);

      const existingMemory = await readFile(memoryPath(selectedAgent)).catch(() => "");
      await writeFile(
        memoryPath(selectedAgent),
        `${existingMemory}\n\n## Compressed ${new Date().toISOString()}\n\n${summary}\n`,
      );
      await writeFile(archivePath(selectedAgent), JSON.stringify(old, null, 2));
      await writeFile(activePath(selectedAgent), JSON.stringify(recent, null, 2));
      setMessages(recent);
      setNotice(`Compressed ${old.length} messages into memory.md.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompressing(false);
    }
  }

  if (!isOpen) return null;

  const showCompressHint = messages.length > COMPRESSION_THRESHOLD;

  return (
    <div className="fixed top-12 right-0 h-[calc(100vh-3rem)] w-96 bg-bb-card border-l border-bb-border z-40 flex flex-col shadow-2xl">
      <div className="flex items-center gap-2 p-3 border-b border-bb-border">
        {selectedAgent && (
          <button
            onClick={() => setSelectedAgent(null)}
            className="p-1 hover:bg-bb-bg rounded"
            title="Back to agent list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <h2 className="flex-1 font-semibold text-sm">
          {selectedAgent || "Direct Messages"}
        </h2>
        {selectedAgent && (
          <button
            onClick={compress}
            disabled={compressing}
            className="p-1 hover:bg-bb-bg rounded disabled:opacity-50"
            title={
              showCompressHint
                ? "Compress old messages into memory (>30 messages)"
                : "Compress old messages"
            }
          >
            <Sparkles
              className={`w-4 h-4 ${showCompressHint ? "text-bb-primary" : "text-gray-400"}`}
            />
          </button>
        )}
        <button onClick={onClose} className="p-1 hover:bg-bb-bg rounded" title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!selectedAgent ? (
        <div className="flex-1 overflow-auto flex flex-col">
          {agents.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No agents yet. Create one from Agents in the sidebar.
            </div>
          ) : (
            <div className="p-2 space-y-1 flex-1">
              {agents.map((a) => (
                <button
                  key={a.name}
                  onClick={() => setSelectedAgent(a.name)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-bb-bg rounded text-left"
                >
                  <Avatar displayName={a.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-gray-500 truncate">{a.role || "Agent"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-bb-border">
            <button
              onClick={() =>
                setNotice("Feedback channel: jay@mybossboard.com (in-app form coming soon).")
              }
              className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
            >
              Send Feedback to BossBoard team
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-gray-500 mt-12">
                Start a conversation with {selectedAgent}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === "user"
                      ? "bg-bb-primary text-white rounded-br-sm"
                      : "bg-bb-bg text-bb-fg rounded-bl-sm border border-bb-border"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {showCompressHint && (
            <div className="px-3 py-1.5 text-[11px] text-bb-primary border-t border-bb-border">
              Conversation is long. Compressing into memory will preserve context while keeping
              recent messages.
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-900/20 border-t border-red-800 text-red-300 text-xs">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}
          {notice && (
            <div className="px-3 py-2 bg-bb-primary/10 border-t border-bb-primary/30 text-bb-primary text-xs">
              {notice}
              <button onClick={() => setNotice(null)} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}

          <div className="border-t border-bb-border p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={`Message ${selectedAgent}...`}
                disabled={sending}
                className="flex-1 px-3 py-2 bg-bb-bg border border-bb-border rounded-lg text-sm focus:outline-none focus:border-bb-primary"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="px-3 bg-bb-primary hover:bg-bb-primary-hover rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

async function summarize(
  transcript: string,
  apiKey: string,
  provider: "google" | "anthropic",
): Promise<string> {
  const prompt = `Summarize these conversation messages concisely. Preserve key facts, decisions, and context. Output as markdown bullet points.\n\n${transcript}`;
  if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Summary failed");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Summary failed");
  return data.content?.[0]?.text || "";
}
