"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveGridLayout,
  type ResponsiveLayouts,
  type Layout,
} from "react-grid-layout";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser, fetchProfile, userKeys } from "@/lib/queries";
import { GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import "react-grid-layout/css/styles.css";

// ─── Widget registry ────────────────────────────────────────────────────────

export interface WidgetConfig {
  id: string;
  label: string;
}

export const WIDGET_REGISTRY: WidgetConfig[] = [
  { id: "agents", label: "My Agents" },
  { id: "quick-stats", label: "Quick Stats" },
  { id: "byok", label: "BYOK Status" },
  { id: "activity", label: "Recent Activity" },
  { id: "overdue", label: "Overdue Items" },
  { id: "checklists", label: "Today's Checklists" },
  { id: "todos", label: "Today's Todos" },
];

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: "agents", x: 0, y: 0, w: 1, h: 2 },
    { i: "quick-stats", x: 1, y: 0, w: 1, h: 2 },
    { i: "byok", x: 2, y: 0, w: 1, h: 2 },
    { i: "activity", x: 0, y: 2, w: 3, h: 2 },
    { i: "overdue", x: 0, y: 4, w: 3, h: 2 },
    { i: "checklists", x: 0, y: 6, w: 3, h: 2 },
    { i: "todos", x: 0, y: 8, w: 3, h: 3 },
  ],
  md: [
    { i: "agents", x: 0, y: 0, w: 1, h: 2 },
    { i: "quick-stats", x: 1, y: 0, w: 1, h: 2 },
    { i: "byok", x: 0, y: 2, w: 2, h: 2 },
    { i: "activity", x: 0, y: 4, w: 2, h: 2 },
    { i: "overdue", x: 0, y: 6, w: 2, h: 2 },
    { i: "checklists", x: 0, y: 8, w: 2, h: 2 },
    { i: "todos", x: 0, y: 10, w: 2, h: 3 },
  ],
  sm: [
    { i: "agents", x: 0, y: 0, w: 1, h: 2 },
    { i: "quick-stats", x: 0, y: 2, w: 1, h: 2 },
    { i: "byok", x: 0, y: 4, w: 1, h: 2 },
    { i: "activity", x: 0, y: 6, w: 1, h: 2 },
    { i: "overdue", x: 0, y: 8, w: 1, h: 2 },
    { i: "checklists", x: 0, y: 10, w: 1, h: 2 },
    { i: "todos", x: 0, y: 12, w: 1, h: 3 },
  ],
};

interface SavedLayout {
  layouts?: ResponsiveLayouts;
  hidden?: string[];
}

// ─── Component ──────────────────────────────────────────────────────────────

interface DashboardGridProps {
  children: Record<string, React.ReactNode>;
  isAdmin: boolean;
}

export function DashboardGrid({ children }: DashboardGridProps) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  // Measure container width
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const userId = user?.id;
  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const saved = (profile?.dashboard_layout ?? {}) as SavedLayout;

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(
    saved.layouts ?? DEFAULT_LAYOUTS
  );
  const [hidden, setHidden] = useState<Set<string>>(
    new Set(saved.hidden ?? [])
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (saved.layouts) setLayouts(saved.layouts);
    if (saved.hidden) setHidden(new Set(saved.hidden));
  }, [profile?.dashboard_layout]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleWidgets = useMemo(
    () => WIDGET_REGISTRY.filter((w) => !hidden.has(w.id)),
    [hidden]
  );

  const filteredLayouts = useMemo(() => {
    const result: ResponsiveLayouts = {};
    for (const [bp, items] of Object.entries(layouts)) {
      result[bp] = (items ?? []).filter((item) => !hidden.has(item.i));
    }
    return result;
  }, [layouts, hidden]);

  const saveLayout = useCallback(
    async (newLayouts: ResponsiveLayouts, newHidden: Set<string>) => {
      if (!userId) return;
      const payload: SavedLayout = {
        layouts: newLayouts,
        hidden: Array.from(newHidden),
      };
      await supabase
        .from("profiles")
        .update({ dashboard_layout: payload })
        .eq("id", userId);
    },
    [userId, supabase]
  );

  const handleLayoutChange = useCallback(
    (_current: Layout, allLayouts: ResponsiveLayouts) => {
      setLayouts(allLayouts);
      saveLayout(allLayouts, hidden);
    },
    [hidden, saveLayout]
  );

  const toggleWidget = useCallback(
    (widgetId: string) => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(widgetId)) next.delete(widgetId);
        else next.add(widgetId);
        saveLayout(layouts, next);
        return next;
      });
    },
    [layouts, saveLayout]
  );

  const resetLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    setHidden(new Set());
    saveLayout(DEFAULT_LAYOUTS, new Set());
  }, [saveLayout]);

  const hiddenCount = hidden.size;

  return (
    <div ref={containerRef}>
      {/* Controls */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground">
              {hiddenCount > 0 ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              Widgets
              {hiddenCount > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{hiddenCount} hidden</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1">
            {WIDGET_REGISTRY.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => toggleWidget(w.id)}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                {hidden.has(w.id) ? (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-primary" />
                )}
                <span className={hidden.has(w.id) ? "text-muted-foreground" : ""}>{w.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={resetLayout}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Grid */}
      <ResponsiveGridLayout
        className="dashboard-grid"
        width={width}
        layouts={filteredLayouts}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 3, md: 2, sm: 1 }}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        dragConfig={{ handle: ".widget-drag-handle" }}
        containerPadding={[0, 0]}
        margin={[16, 16]}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
      >
        {visibleWidgets.map((w) => (
          <div
            key={w.id}
            className={cn(
              "relative group",
              isDragging && "select-none"
            )}
          >
            <div className="widget-drag-handle absolute top-2 right-2 z-10 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {children[w.id]}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
