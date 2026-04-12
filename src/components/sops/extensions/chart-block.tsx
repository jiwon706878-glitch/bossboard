"use client";

import { useState, useMemo } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CHART_COLORS = ["#4F8BFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#F472B6", "#38BDF8", "#FB923C"];

const DEFAULT_CONFIG = JSON.stringify(
  {
    type: "bar",
    data: [
      { name: "Jan", value: 120 },
      { name: "Feb", value: 200 },
      { name: "Mar", value: 150 },
      { name: "Apr", value: 280 },
    ],
  },
  null,
  2
);

interface ChartConfig {
  type: "bar" | "line" | "pie" | "area";
  data: Array<Record<string, string | number>>;
  xKey?: string;
  yKey?: string;
}

function parseConfig(raw: string): ChartConfig | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.type || !Array.isArray(parsed.data)) return null;
    return parsed as ChartConfig;
  } catch {
    return null;
  }
}

function ChartRenderer({ config }: { config: ChartConfig }) {
  const xKey = config.xKey || "name";
  const yKey = config.yKey || "value";
  const data = config.data;

  switch (config.type) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="var(--text-secondary, #8B95B0)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary, #8B95B0)" />
            <Tooltip contentStyle={{ background: "var(--bg-secondary, #141824)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={yKey} fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="var(--text-secondary, #8B95B0)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary, #8B95B0)" />
            <Tooltip contentStyle={{ background: "var(--bg-secondary, #141824)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    case "area":
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="var(--text-secondary, #8B95B0)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary, #8B95B0)" />
            <Tooltip contentStyle={{ background: "var(--bg-secondary, #141824)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    case "pie":
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "var(--text-secondary, #8B95B0)" }} fontSize={11}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--bg-secondary, #141824)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    default:
      return <p className="text-sm text-muted-foreground">Unsupported chart type: {config.type}</p>;
  }
}

export function ChartBlock({ node, updateAttributes, editor }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.config);
  const [configText, setConfigText] = useState<string>(node.attrs.config || DEFAULT_CONFIG);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => parseConfig(isEditing ? "" : (node.attrs.config || "")), [node.attrs.config, isEditing]);

  const handleSave = () => {
    const parsed = parseConfig(configText);
    if (!parsed) {
      setError('Invalid JSON. Need: { "type": "bar|line|pie|area", "data": [...] }');
      return;
    }
    setError(null);
    updateAttributes({ config: configText });
    setIsEditing(false);
  };

  const editable = editor?.isEditable ?? false;

  return (
    <NodeViewWrapper className="chart-block my-3" data-chart="">
      <div className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground select-none">Chart</span>
          {editable && !isEditing && (
            <button
              type="button"
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="p-3 space-y-2">
            <textarea
              value={configText}
              onChange={(e) => { setConfigText(e.target.value); setError(null); }}
              className="w-full h-40 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder='{ "type": "bar", "data": [{"name":"A","value":10}] }'
              spellCheck={false}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {(["bar", "line", "pie", "area"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="px-2 py-0.5 text-[10px] font-mono rounded border border-border hover:bg-muted transition-colors"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(configText);
                      parsed.type = t;
                      setConfigText(JSON.stringify(parsed, null, 2));
                    } catch { /* ignore */ }
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                onClick={() => {
                  setConfigText(node.attrs.config || DEFAULT_CONFIG);
                  setError(null);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3">
            {config ? (
              <ChartRenderer config={config} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No chart data configured</p>
            )}
            {editable && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center select-none">
                Double-click to edit
              </p>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
