import Link from "next/link";
import { CheckSquare, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChecklistRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  items: { text: string }[];
  assigned_to: string | null;
}

interface TodayChecklistsProps {
  checklists: ChecklistRow[];
}

export function TodayChecklists({ checklists }: TodayChecklistsProps) {
  return (
    <Card className="rounded-md border-l-[3px] border-l-primary shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="h-4 w-4 text-primary" />
          Today&apos;s Checklists ({checklists.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checklists.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No checklists scheduled for today
          </p>
        ) : (
          <div className="space-y-1">
            {checklists.map((cl) => {
              const itemCount = cl.items?.length ?? 0;
              const isInProgress = cl.status === "in_progress";
              return (
                <Link key={cl.id} href={`/dashboard/checklists/${cl.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                  {cl.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : isInProgress ? (
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-sm">{cl.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {itemCount} items · {cl.status === "pending" ? "not started" : cl.status.replace("_", " ")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
