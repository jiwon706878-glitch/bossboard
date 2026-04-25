import { readFile } from "@/lib/tauri/fs";
import { parseMarkdown } from "@/lib/markdown/frontmatter";

interface AgentManualFrontmatter {
  ai_provider?: "google" | "anthropic" | "openai" | "grok" | "local";
  model?: string;
}

export async function executeDMTurn(
  agentName: string,
  userMessage: string,
): Promise<string> {
  const root = localStorage.getItem("bb_workspace_path") || "";
  const manualPath = `${root}/agents/${agentName}/manual.md`;
  const memoryPath = `${root}/agents/${agentName}/memory.md`;

  const manualRaw = await readFile(manualPath);
  const memoryRaw = await readFile(memoryPath).catch(() => "");
  const { frontmatter, content: manualContent } = parseMarkdown(manualRaw);
  const fm = frontmatter as unknown as AgentManualFrontmatter;
  const provider = fm.ai_provider || "google";
  const model = fm.model || (provider === "anthropic" ? "claude-haiku-4-5-20251001" : "gemini-2.5-flash");

  const apiKey = localStorage.getItem(`bb_api_key_${provider}`) || "";
  if (!apiKey) {
    throw new Error(
      `No API key for provider "${provider}". Add one in Settings → AI providers.`,
    );
  }

  const systemPrompt = `${manualContent}\n\n## Memory (past conversations summary)\n${memoryRaw}`;

  if (provider === "google") {
    return await callGemini(model, systemPrompt, userMessage, apiKey);
  }
  if (provider === "anthropic") {
    return await callClaude(model, systemPrompt, userMessage, apiKey);
  }
  throw new Error(`Provider "${provider}" not yet supported. Use google or anthropic.`);
}

async function callGemini(
  model: string,
  system: string,
  userMsg: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${system}\n\nUser: ${userMsg}` }] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "(empty response)";
}

async function callClaude(
  model: string,
  system: string,
  userMsg: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude error");
  return data.content?.[0]?.text || "(empty response)";
}
