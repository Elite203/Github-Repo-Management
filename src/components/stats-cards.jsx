import { GitFork, Globe, Lock, Star, BookMarked } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export function StatsCards({ repos, loading }) {
    const total = repos.length;
    const publicCount = repos.filter((r) => !r.private).length;
    const privateCount = repos.filter((r) => r.private).length;
    const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
    const forks = repos.reduce((a, r) => a + r.forks_count, 0);
    const items = [
        { label: "Total Repos", value: total, icon: BookMarked, color: "text-info" },
        { label: "Public", value: publicCount, icon: Globe, color: "text-success" },
        { label: "Private", value: privateCount, icon: Lock, color: "text-warning" },
        { label: "Stars", value: stars, icon: Star, color: "text-warning" },
        { label: "Forks", value: forks, icon: GitFork, color: "text-info" },
    ];
    return (<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it, i) => (<Card key={it.label} className="hover-lift animate-fade-in border-border/60 shadow-card" style={{ animationDelay: `${i * 60}ms` }}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{it.label}</p>
              {loading ? (<Skeleton className="mt-1 h-7 w-16"/>) : (<p className="mt-1 text-2xl font-semibold tabular-nums">
                  {it.value.toLocaleString()}
                </p>)}
            </div>
            <div className={`rounded-md bg-muted p-2 ${it.color}`}>
              <it.icon className="h-5 w-5"/>
            </div>
          </CardContent>
        </Card>))}
    </div>);
}
