import { streamText, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { readFile } from "@/lib/tauri/fs";
import { parseMarkdown } from "@/lib/markdown/frontmatter";
import { ApiKeys } from "@/lib/tauri/keychain";
import { detectLoopHash, recordInteraction } from "./loop-guard";
import { callWithTimeout, wrapAIError } from "./errors";

interface AgentManualFrontmatter {
  ai_provider?: "google" | "anthropic" | "openai" | "grok" | "local";
  model?: string;
}

const DEFAULTS = {
  google: "gemini-2.5-flash",
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o",
};

const CONTEXT_LIMITS: Record<string, number> = {
  "gemini-2.5-flash": 1_000_000,
  "gemini-2.5-pro": 1_000_000,
  "claude-sonnet-4-20250514": 200_000,
  "claude-sonnet-4-6": 200_000,
  "claude-opus-4-7": 200_000,
  "claude-haiku-4-5-20251001": 200_000,
  "gpt-4o": 128_000,
};

const TIMEOUT_MS_DEFAULT = 60_000;
const TIMEOUT_MS_LOCAL = 5 * 60_000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

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
  const topic = detectLoopHash(userMessage);
  if (!recordInteraction(agentName, topic)) {
    throw new Error(
      `Loop guard: "${agentName}" received the same prompt > 5 times in 5 min. Stopped for safety.`,
    );
  }

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

  const limit = CONTEXT_LIMITS[modelName || DEFAULTS[provider as keyof typeof DEFAULTS] || ""] || 100_000;
  const totalTokens = estimateTokens(system) + estimateTokens(userMessage);
  if (totalTokens > limit * 0.85) {
    throw new Error(
      `Context too large (~${totalTokens.toLocaleString()} tokens, ${Math.round(
        (totalTokens / limit) * 100,
      )}% of ${limit.toLocaleString()}). Compress this conversation in the DM panel before continuing.`,
    );
  }

  const model = await pickModel(provider, modelName);
  const timeoutMs = provider === "local" ? TIMEOUT_MS_LOCAL : TIMEOUT_MS_DEFAULT;

  try {
    if (onChunk) {
      const stream = streamText({ model, system, prompt: userMessage });
      let full = "";
      await callWithTimeout(
        async () => {
          for await (const chunk of stream.textStream) {
            full += chunk;
            onChunk(chunk);
          }
        },
        timeoutMs,
        `${provider} timed out after ${Math.round(timeoutMs / 1000)}s.`,
      );
      return full;
    }

    const { text } = await callWithTimeout(
      () => generateText({ model, system, prompt: userMessage }),
      timeoutMs,
      `${provider} timed out after ${Math.round(timeoutMs / 1000)}s.`,
    );
    return text;
  } catch (e: unknown) {
    throw wrapAIError(provider, e);
  }
}
