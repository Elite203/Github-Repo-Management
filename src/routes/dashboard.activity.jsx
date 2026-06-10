import { formatDistanceToNow } from "date-fns";
import { Activity, AlertCircle, KeyRound, Layers, Trash2 } from "lucide-react";
import { useActivityLog } from "@/hooks/use-activity-log";
import { Button } from "@/components/ui/button";

const iconFor = (t) => {
  switch (t) {
    case "auth": return KeyRound;
    case "bulk": return Layers;
    case "error": return AlertCircle;
    default: return Activity;
  }
};

export function ActivityPage() {
  const { entries, clear } = useActivityLog();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Recent visibility changes and authentication events, kept locally.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="mr-2 h-3.5 w-3.5"/> Clear log
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card">
        {entries.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No activity yet. Visibility changes will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => {
              const Icon = iconFor(e.type);
              return (
                <li key={e.id} className="flex items-start gap-3 p-4">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted ${e.type === "error" ? "text-destructive" : "text-primary"}`}>
                    <Icon className="h-4 w-4"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{e.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
