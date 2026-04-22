import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/meetings/[id]/start — Execute the AI meeting
 *
 * Runs 3 rounds of discussion among participants, generates a
 * conclusion, and auto-posts it to the board announcements channel.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Load meeting and verify it's draft + user is creator
    const { data: meeting, error: meetingError } = await admin
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.created_by !== user.id) {
      return NextResponse.json({ error: "Only the meeting creator can start it" }, { status: 403 });
    }

    if (meeting.status !== "draft") {
      return NextResponse.json({ error: "Meeting has already been started" }, { status: 400 });
    }

    // 2. Set status to in_progress
    await admin
      .from("meetings")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", id);

    // 3. Load participants with profiles
    const { data: participants } = await admin
      .from("meeting_participants")
      .select("profile_id, role, profiles:profile_id(id, full_name, agent_role, agent_manual_page_id)")
      .eq("meeting_id", id);

    if (!participants || participants.length === 0) {
      await admin
        .from("meetings")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ error: "No participants found" }, { status: 400 });
    }

    // 4. Load SOP content for each participant's manual page
    const manualPageIds = participants
      .map((p: Record<string, unknown>) => {
        const profile = p.profiles as Record<string, unknown> | null;
        return profile?.agent_manual_page_id as string | null;
      })
      .filter((id): id is string => !!id);

    let sopContents: Record<string, string> = {};
    if (manualPageIds.length > 0) {
      const { data: sops } = await admin
        .from("sops")
        .select("id, title, content")
        .in("id", manualPageIds);

      if (sops) {
        for (const sop of sops) {
          // Extract text from TipTap JSON content
          let textContent = "";
          try {
            if (typeof sop.content === "string") {
              textContent = sop.content;
            } else if (sop.content && typeof sop.content === "object") {
              textContent = extractTextFromTipTap(sop.content);
            }
          } catch {
            textContent = JSON.stringify(sop.content).slice(0, 2000);
          }
          sopContents[sop.id] = `${sop.title}\n\n${textContent}`;
        }
      }
    }

    // 5. Get the meeting creator's BYOK API key
    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("external_api_keys")
      .eq("id", user.id)
      .single();

    const apiKeys = (creatorProfile?.external_api_keys ?? {}) as Record<string, string | undefined>;
    const apiKey = apiKeys.anthropic;

    if (!apiKey) {
      // Reset to draft so user can try again after adding key
      await admin
        .from("meetings")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json(
        { error: "No AI provider configured. Add your Anthropic API key in Settings." },
        { status: 402 }
      );
    }

    // 6. Run 3 rounds of discussion
    let messageOrder = 0;
    const allMessages: Array<{ name: string; role: string; content: string }> = [];

    for (let round = 1; round <= 3; round++) {
      for (const participant of participants) {
        const profile = participant.profiles as unknown as Record<string, unknown> | null;
        if (!profile) continue;

        const agentName = (profile.full_name as string) || "Agent";
        const agentRole = (profile.agent_role as string) || "participant";
        const manualPageId = profile.agent_manual_page_id as string | null;
        const manualContent = manualPageId ? sopContents[manualPageId] || "" : "";

        const priorMessages = allMessages
          .map((m) => `${m.name} (${m.role}): ${m.content}`)
          .join("\n");

        const systemPrompt = [
          `You are ${agentName}, role: ${agentRole}.`,
          manualContent ? `Your manual:\n${manualContent.slice(0, 1500)}` : "",
          `You are in a meeting about: ${meeting.topic}`,
          `Round ${round}/3.`,
          priorMessages ? `Previous messages:\n${priorMessages}` : "This is the start of the meeting.",
          "Respond with your perspective in 2-3 sentences.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const prompt = `Share your thoughts on "${meeting.topic}" for round ${round}.`;

        const text = await callAnthropic(apiKey, systemPrompt, prompt);

        // Save message
        messageOrder++;
        await admin.from("meeting_messages").insert({
          meeting_id: id,
          sender_id: profile.id as string,
          content: text,
          message_order: messageOrder,
        });

        allMessages.push({ name: agentName, role: agentRole, content: text });
      }
    }

    // 7. Generate conclusion
    const conclusionSystemPrompt =
      "You are a meeting facilitator. Summarize the key points, decisions, and action items from this meeting in a clear, concise format.";

    const conclusionPrompt = [
      `Meeting topic: ${meeting.topic}`,
      "",
      "Meeting transcript:",
      ...allMessages.map((m) => `${m.name} (${m.role}): ${m.content}`),
      "",
      "Please provide a concise summary with key decisions and action items.",
    ].join("\n");

    const conclusion = await callAnthropic(apiKey, conclusionSystemPrompt, conclusionPrompt);

    // 8. Update meeting status and conclusion
    await admin
      .from("meetings")
      .update({
        status: "completed",
        conclusion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // 9. Auto-post conclusion to board announcements channel
    await admin.from("board_posts").insert({
      business_id: meeting.business_id,
      title: `Meeting Summary: ${meeting.title}`,
      content: conclusion,
      user_id: user.id,
      channel: "announcements",
    });

    return NextResponse.json({
      success: true,
      message_count: messageOrder,
      conclusion,
    });
  } catch (error) {
    console.error("Meeting start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Call Anthropic API with the BYOK pattern used throughout the codebase.
 */
async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  prompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
      system: systemPrompt,
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

/**
 * Extract plain text from TipTap JSON content.
 */
function extractTextFromTipTap(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  let text = "";
  if (n.text && typeof n.text === "string") {
    text += n.text;
  }
  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      text += extractTextFromTipTap(child) + "\n";
    }
  }
  return text.trim();
}
