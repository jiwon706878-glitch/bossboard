"use client";

import { useState, useMemo } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import katex from "katex";

export function MathBlock({ node, updateAttributes, editor }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.latex);
  const [latex, setLatex] = useState<string>(node.attrs.latex || "E = mc^2");

  const rendered = useMemo(() => {
    if (!node.attrs.latex) return null;
    try {
      return {
        html: katex.renderToString(node.attrs.latex, {
          displayMode: true,
          throwOnError: false,
          output: "htmlAndMathml",
        }),
        error: null,
      };
    } catch (e: unknown) {
      return {
        html: "",
        error: e instanceof Error ? e.message : "Invalid LaTeX",
      };
    }
  }, [node.attrs.latex]);

  const handleSave = () => {
    updateAttributes({ latex });
    setIsEditing(false);
  };

  const editable = editor?.isEditable ?? false;

  return (
    <NodeViewWrapper className="math-block my-3" data-math="">
      <div className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground select-none">Math</span>
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
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="E = mc^2"
              spellCheck={false}
            />
            <div className="flex gap-2 flex-wrap">
              {[
                ["Fraction", "\\frac{a}{b}"],
                ["Sum", "\\sum_{i=1}^{n} x_i"],
                ["Integral", "\\int_{a}^{b} f(x)\\,dx"],
                ["Matrix", "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"],
              ].map(([label, snippet]) => (
                <button
                  key={label}
                  type="button"
                  className="px-2 py-0.5 text-[10px] font-mono rounded border border-border hover:bg-muted transition-colors"
                  onClick={() => setLatex((prev) => prev + " " + snippet)}
                >
                  {label}
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
                  setLatex(node.attrs.latex || "");
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3">
            {rendered?.error ? (
              <div className="text-sm text-destructive bg-destructive/5 rounded-md p-3 font-mono">
                {rendered.error}
              </div>
            ) : rendered?.html ? (
              <div
                className="flex justify-center py-2 [&_.katex]:text-foreground"
                dangerouslySetInnerHTML={{ __html: rendered.html }}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No equation entered</p>
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
