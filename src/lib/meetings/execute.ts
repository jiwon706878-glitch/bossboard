import { executeDMTurn } from "@/lib/agents/execute";

export interface MeetingMessage {
  agent: string;
  content: string;
  round: number;
}

export interface MeetingResult {
  topic: string;
  participants: string[];
  rounds: number;
  messages: MeetingMessage[];
  conclusion: string;
  startedAt: string;
  endedAt: string;
}

export async function runMeeting(
  topic: string,
  agentNames: string[],
  rounds: number,
  onProgress?: (msg: MeetingMessage) => void,
): Promise<MeetingResult> {
  if (agentNames.length === 0) {
    throw new Error("Pick at least one agent.");
  }
  const messages: MeetingMessage[] = [];
  const startedAt = new Date().toISOString();

  for (let round = 1; round <= rounds; round++) {
    for (const agentName of agentNames) {
      const transcript = messages
        .map((m) => `[Round ${m.round}] ${m.agent}: ${m.content}`)
        .join("\n\n");
      const stage =
        round === 1
          ? "Share your initial perspective."
          : round === rounds
            ? "Provide your final position before we conclude."
            : "Respond to the discussion so far and add your viewpoint.";
      const prompt = `Meeting topic: ${topic}\n\nPrevious discussion:\n${transcript || "(none yet)"}\n\nYou are ${agentName}. Round ${round} of ${rounds}. ${stage}\nKeep responses concise (3-5 sentences).`;
      const content = await executeDMTurn(agentName, prompt);
      const msg: MeetingMessage = { agent: agentName, content, round };
      messages.push(msg);
      onProgress?.(msg);
    }
  }

  const conclusion = await summarizeMeeting(topic, messages);
  return {
    topic,
    participants: agentNames,
    rounds,
    messages,
    conclusion,
    startedAt,
    endedAt: new Date().toISOString(),
  };
}

async function summarizeMeeting(
  topic: string,
  messages: MeetingMessage[],
): Promise<string> {
  const apiKey =
    localStorage.getItem("bb_api_key_google") ||
    localStorage.getItem("bb_api_key_anthropic") ||
    "";
  if (!apiKey) {
    return "(No API key for summary — meeting transcript captured above.)";
  }
  const transcript = messages
    .map((m) => `[Round ${m.round}] ${m.agent}: ${m.content}`)
    .join("\n\n");
  const prompt = `Summarize this meeting and provide a clear conclusion.\n\nTopic: ${topic}\n\nDiscussion:\n${transcript}\n\nProvide:\n1. Key points raised\n2. Areas of agreement\n3. Areas of disagreement\n4. Recommended action items`;

  if (localStorage.getItem("bb_api_key_google")) {
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
    if (!res.ok) return `(Summary failed: ${data?.error?.message || "unknown"})`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Meeting concluded without summary.";
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
  if (!res.ok) return `(Summary failed: ${data?.error?.message || "unknown"})`;
  return data.content?.[0]?.text || "Meeting concluded without summary.";
}

export function meetingToMarkdown(result: MeetingResult): string {
  const lines: string[] = [];
  lines.push(`# ${result.topic}`);
  lines.push("");
  lines.push(`**Participants:** ${result.participants.join(", ")}`);
  lines.push(`**Rounds:** ${result.rounds}`);
  lines.push(`**Started:** ${result.startedAt}`);
  lines.push(`**Ended:** ${result.endedAt}`);
  lines.push("");
  lines.push("## Conclusion");
  lines.push("");
  lines.push(result.conclusion);
  lines.push("");
  lines.push("## Transcript");
  lines.push("");
  for (let r = 1; r <= result.rounds; r++) {
    lines.push(`### Round ${r}`);
    lines.push("");
    for (const m of result.messages.filter((x) => x.round === r)) {
      lines.push(`**${m.agent}:** ${m.content}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
