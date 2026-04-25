"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";
import { Avatar } from "@/components/desktop/avatar";
import { executeDMTurn } from "@/lib/agents/execute";
import { writeFile, readFile, fileExists } from "@/lib/tauri/fs";

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export default function DMPage() {
  const params = useParams();
  const agentName = decodeURIComponent(params.agent as string);
  const conversationFile = `${
    typeof window !== "undefined" ? localStorage.getItem("bb_workspace_path") || "" : ""
  }/agents/${agentName}/conversations/active.json`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        if (await fileExists(conversationFile)) {
          const raw = await readFile(conversationFile);
          setMessages(JSON.parse(raw));
        }
      } catch {
        // No prior conversation; start fresh
      }
    })();
  }, [conversationFile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await executeDMTurn(agentName, userMsg.content);
      const agentMsg: Message = {
        role: "agent",
        content: response,
        timestamp: new Date().toISOString(),
      };
      const updated = [...next, agentMsg];
      setMessages(updated);
      try {
        await writeFile(conversationFile, JSON.stringify(updated, null, 2));
      } catch {
        // Disk write failure is non-fatal here; conversation stays in memory.
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-bb-border p-4 flex items-center gap-3">
        <Avatar displayName={agentName} size="md" />
        <div>
          <h1 className="font-semibold">{agentName}</h1>
          <p className="text-xs text-gray-500">Direct message</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-500 mt-12">
            Start a conversation with {agentName}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                m.role === "user" ? "bg-bb-primary text-white" : "bg-bb-card"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-bb-card p-3 rounded-lg text-sm text-gray-400">Thinking...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border-t border-red-800 text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="border-t border-bb-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`Message ${agentName}...`}
            disabled={sending}
            className="flex-1 px-3 py-2 bg-bb-card border border-bb-border rounded-md text-sm"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
