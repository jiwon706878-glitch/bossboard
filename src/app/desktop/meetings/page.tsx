"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Modal } from "@/components/desktop/modal";
import { listAgents, type Agent } from "@/lib/agents/service";
import {
  runMeeting,
  meetingToMarkdown,
  type MeetingMessage,
  type MeetingResult,
} from "@/lib/meetings/execute";
import {
  writeFile,
  listDirectory,
  createDirectory,
  fileExists,
} from "@/lib/tauri/fs";
import { stringifyMarkdown, generateId } from "@/lib/markdown/frontmatter";

interface MeetingFile {
  path: string;
  name: string;
  modified: number;
}

export default function MeetingsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [meetings, setMeetings] = useState<MeetingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [topic, setTopic] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [rounds, setRounds] = useState(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<MeetingMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);

  function meetingsDir() {
    const ws = localStorage.getItem("bb_workspace_path") || "";
    return `${ws}/Library/meetings`;
  }

  async function refresh() {
    setLoading(true);
    try {
      setAgents(await listAgents());
      const dir = meetingsDir();
      if (await fileExists(dir)) {
        const entries = await listDirectory(dir);
        setMeetings(
          entries
            .filter((e) => !e.is_directory && e.name.endsWith(".md"))
            .map((e) => ({ path: e.path, name: e.name, modified: e.modified }))
            .sort((a, b) => b.modified - a.modified),
        );
      } else {
        setMeetings([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function togglePick(name: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  async function start() {
    if (!topic.trim() || picked.size === 0) {
      setError("Topic and at least one participant required.");
      return;
    }
    setRunning(true);
    setError(null);
    setProgress([]);
    setResult(null);
    try {
      const r = await runMeeting(topic.trim(), Array.from(picked), rounds, (m) =>
        setProgress((p) => [...p, m]),
      );
      setResult(r);

      const dir = meetingsDir();
      await createDirectory(dir);
      const safeTopic = topic.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);
      const date = new Date().toISOString().slice(0, 10);
      const path = `${dir}/${date}-${safeTopic}.md`;
      const fm = {
        id: generateId(),
        title: topic.trim(),
        tags: ["meeting"],
        created: r.startedAt,
        modified: r.endedAt,
      };
      await writeFile(path, stringifyMarkdown(fm as never, meetingToMarkdown(r)));
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setCreateOpen(false);
    setTopic("");
    setPicked(new Set());
    setRounds(3);
    setProgress([]);
    setResult(null);
    setError(null);
    setRunning(false);
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/desktop/dashboard"
              className="text-sm text-gray-400 hover:text-bb-fg"
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold mt-2">Meetings</h1>
            <p className="text-sm text-gray-400 mt-1">
              Multi-agent discussions saved to <code>/Library/meetings/</code>.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            <Plus className="w-4 h-4" /> New meeting
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : meetings.length === 0 ? (
          <div className="p-8 bg-bb-card border border-bb-border rounded-md text-center text-gray-400">
            No meetings yet.
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => (
              <Link
                key={m.path}
                href={`/desktop/library/edit?path=${encodeURIComponent(m.path)}`}
                className="block p-3 bg-bb-card rounded-md border border-bb-border hover:border-bb-primary transition"
              >
                <div className="text-sm font-medium">{m.name.replace(/\.md$/, "")}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(m.modified * 1000).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => (running ? null : reset())}
        title={result ? "Meeting saved" : "New meeting"}
      >
        {result ? (
          <div className="space-y-3 text-sm">
            <div className="text-bb-primary">
              Saved to /Library/meetings/. Conclusion preview:
            </div>
            <div className="p-3 bg-bb-bg border border-bb-border rounded-md text-xs whitespace-pre-wrap max-h-60 overflow-auto">
              {result.conclusion}
            </div>
            <div className="flex justify-end">
              <button
                onClick={reset}
                className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Topic / question</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                disabled={running}
                placeholder="What should the agents discuss?"
                className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Participants ({picked.size})
              </label>
              {agents.length === 0 ? (
                <div className="text-xs text-gray-500">
                  No agents yet — create some in /agents first.
                </div>
              ) : (
                <div className="max-h-40 overflow-auto space-y-1 border border-bb-border rounded-md p-2">
                  {agents.map((a) => (
                    <label
                      key={a.name}
                      className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-bb-bg rounded"
                    >
                      <input
                        type="checkbox"
                        disabled={running}
                        checked={picked.has(a.name)}
                        onChange={() => togglePick(a.name)}
                      />
                      <span className="flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-gray-500 truncate">
                        {a.role || "Agent"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rounds</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rounds}
                disabled={running}
                onChange={(e) => setRounds(Math.max(1, Math.min(10, Number(e.target.value))))}
                className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
              />
            </div>

            {progress.length > 0 && (
              <div className="p-2 bg-bb-bg border border-bb-border rounded-md max-h-48 overflow-auto text-xs space-y-1">
                {progress.map((m, i) => (
                  <div key={i}>
                    <span className="text-bb-primary">[R{m.round}] {m.agent}:</span>{" "}
                    <span className="text-gray-300">{m.content.slice(0, 120)}…</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="p-2 bg-red-900/20 border border-red-800 rounded text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={reset}
                disabled={running}
                className="px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-bg rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={start}
                disabled={running || !topic.trim() || picked.size === 0}
                className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md disabled:opacity-50"
              >
                {running ? `Running… (${progress.length}/${rounds * picked.size})` : "Start"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
