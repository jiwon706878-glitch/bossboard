import { streamText, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { readFile } from "@/lib/tauri/fs";
import { parseMarkdown } from "@/lib/markdown/frontmatter";
import { ApiKeys } from "@/lib/tauri/keychain";

interface AgentManualFrontmatter {
  ai_provider?: "google" | "anthropic" | "openai" | "grok" | "local";
  model?: string;
}

const DEFAULTS = {
  google: "gemini-2.5-flash",
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o",
};

async function pickModel(provider: string, modelName?: string) {
  const wanted = modelName?.trim() || "";
  if (provider === "google") {
    const apiKey = await ApiKeys.google();
    if (!apiKey) throw new Error("No Google API key. Add one in Settings.");
    const google = createGoogleGenerativeAI({ apiKey });
    return google(wanted || DEFAULTS.google);
  }
  if (provider === "anthropic") {
    const apiKey = await ApiKeys.anthropic();
    if (!apiKey) throw new Error("No Anthropic API key. Add one in Settings.");
    const anthropic = createAnthropic({
      apiKey,
      headers: { "anthropic-dangerous-direct-browser-access": "true" },
    });
    return anthropic(wanted || DEFAULTS.anthropic);
  }
  if (provider === "openai") {
    const apiKey = await ApiKeys.openai();
    if (!apiKey) throw new Error("No OpenAI API key. Add one in Settings.");
    const openai = createOpenAI({ apiKey });
    return openai(wanted || DEFAULTS.openai);
  }
  throw new Error(`Provider "${provider}" not supported yet. Use google, anthropic, or openai.`);
}

export async function executeDMTurn(
  agentName: string,
  userMessage: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const root = localStorage.getItem("bb_workspace_path") || "";
  const manualPath = `${root}/agents/${agentName}/manual.md`;
  const memoryPath = `${root}/agents/${agentName}/memory.md`;

  const manualRaw = await readFile(manualPath);
  const memoryRaw = await readFile(memoryPath).catch(() => "");
  const { frontmatter, content: manualContent } = parseMarkdown(manualRaw);
  const fm = frontmatter as unknown as AgentManualFrontmatter;
  const provider = fm.ai_provider || "google";
  const modelName = fm.model || "";

  const system = `${manualContent}\n\n## Memory (past conversations summary)\n${memoryRaw}`;
  const model = await pickModel(provider, modelName);

  if (onChunk) {
    const stream = streamText({
      model,
      system,
      prompt: userMessage,
    });
    let full = "";
    for await (const chunk of stream.textStream) {
      full += chunk;
      onChunk(chunk);
    }
    return full;
  }

  const { text } = await generateText({ model, system, prompt: userMessage });
  return text;
}
