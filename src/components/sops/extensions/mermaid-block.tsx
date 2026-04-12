"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

let mermaidInitialized = false;

export function MermaidBlock({ node, updateAttributes, editor }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.code);
  const [code, setCode] = useState<string>(node.attrs.code || "graph TD;\n  A-->B;\n  B-->C;");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`);

  const renderDiagram = useCallback(async () => {
    if (!code.trim() || !containerRef.current) return;
    try {
      const mermaid = (await import("mermaid")).default;
      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
          fontFamily: "var(--font-body, sans-serif)",
        });
        mermaidInitialized = true;
      }
      // Reset previous render
      containerRef.current.innerHTML = "";
      const id = idRef.current + "-" + Date.now();
      const { svg } = await mermaid.render(id, code);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid diagram syntax";
      setError(msg);
      if (containerRef.current) containerRef.current.innerHTML = "";
    }
  }, [code]);

  useEffect(() => {
    if (!isEditing && code.trim()) {
      renderDiagram();
    }
  }, [isEditing, code, renderDiagram]);

  const handleSave = () => {
    updateAttributes({ code });
    setIsEditing(false);
  };

  const editable = editor?.isEditable ?? false;

  return (
    <NodeViewWrapper className="mermaid-block my-3" data-mermaid="">
      <div className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground select-none">Mermaid Diagram</span>
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
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-32 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="graph TD;&#10;  A-->B;&#10;  B-->C;"
              spellCheck={false}
            />
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
                  setCode(node.attrs.code || "");
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3">
            {error ? (
              <div className="text-sm text-destructive bg-destructive/5 rounded-md p-3 font-mono">
                {error}
              </div>
            ) : (
              <div
                ref={containerRef}
                className="flex justify-center [&_svg]:max-w-full"
              />
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
