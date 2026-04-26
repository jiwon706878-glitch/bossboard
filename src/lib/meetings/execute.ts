import { executeDMTurn } from "@/lib/agents/execute";
import { loadKeys } from "@/lib/ai/keys";

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

export interface RunMeetingOptions {
  /** When true, agents may "pass" or interrupt each other and prompt
   *  rules loosen for emergent group behaviour. Gated to Pro+ via the
   *  free_discussion_meeting Beta Feature toggle in the caller. */
  freeDiscussion?: boolean;
}

export async function runMeeting(
  topic: string,
  agentNames: string[],
  rounds: number,
  onProgress?: (msg: MeetingMessage) => void,
  options: RunMeetingOptions = {},
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

      const prompt = options.freeDiscussion
        ? buildFreeDiscussionPrompt(agentName, topic, round, rounds, transcript)
        : buildSequentialPrompt(agentName, topic, round, rounds, stage, transcript);

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

function buildSequentialPrompt(
  agentName: string,
  topic: string,
  round: number,
  rounds: number,
  stage: string,
  transcript: string,
): string {
  // Anti-echo-chamber rules: meetings devolve into agreement spam when each
  // agent leads with "I agree with X". Force concrete contribution or an
  // explicit "nothing to add — passing" exit.
  return `Meeting topic: ${topic}

Previous discussion:
${transcript || "(none yet)"}

You are ${agentName}. Round ${round} of ${rounds}. ${stage}

Critical rules for this meeting:
1. DO NOT start with "I agree" or "Great point" or any sycophantic opener.
2. DO NOT recap what other agents said — go straight to YOUR contribution.
3. If you disagree, say so directly with reasoning.
4. Add NEW information, analysis, or a concrete next step. Never just rephrase.
5. Be concise — 3-5 sentences ideal.
6. End with a concrete next step or open question (not "let me know your thoughts").
7. If you have NOTHING new to add, say "I have nothing new to add — passing." and stop.`;
}

function buildFreeDiscussionPrompt(
  agentName: string,
  topic: string,
  round: number,
  rounds: number,
  transcript: string,
): string {
  // Pro+ Beta Feature. Looser turn structure for emergent group dynamics.
  return `Meeting topic: ${topic}

Recent discussion:
${transcript || "(none yet)"}

You are ${agentName}. Round ${round} of ${rounds}. This is a FREE DISCUSSION meeting.

You can:
- Interrupt the previous speaker if you have crucial input.
- Ask other agents direct questions by name.
- Disagree directly with reasoning.
- Skip your turn entirely with "I have nothing new to add — passing." and stop.

Still required:
- Don't repeat what others said.
- Add new value with each turn.
- Be concise (3-5 sentences ideal).`;
}

async function summarizeMeeting(
  topic: string,
  messages: MeetingMessage[],
): Promise<string> {
  const allKeys = await loadKeys();
  const googleKey = allKeys.find((k) => k.provider === "google");
  const anthropicKey = allKeys.find((k) => k.provider === "anthropic");
  const picked = googleKey ?? anthropicKey;
  if (!picked) {
    return "(No Google or Anthropic key for summary — meeting transcript captured above.)";
  }
  const apiKey = picked.key;
  const transcript = messages
    .map((m) => `[Round ${m.round}] ${m.agent}: ${m.content}`)
    .join("\n\n");
  const prompt = `Summarize this meeting and provide a clear conclusion.\n\nTopic: ${topic}\n\nDiscussion:\n${transcript}\n\nProvide:\n1. Key points raised\n2. Areas of agreement\n3. Areas of disagreement\n4. Recommended action items`;

  if (picked.provider === "google") {
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
