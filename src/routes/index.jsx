import { Link } from "@tanstack/react-router";
import { ArrowRight, GitBranch, Globe, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary text-primary-foreground">
            <GitBranch className="h-4 w-4"/>
          </div>
          <span className="font-semibold">RepoCtrl</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="animate-fade-in text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3"/> Built for developers who ship
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Manage every GitHub repo from
            <span className="bg-gradient-to-r from-primary to-[oklch(0.78_0.2_145)] bg-clip-text text-transparent"> one dashboard</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-muted-foreground">
            Toggle visibility, run bulk public/private actions, search and filter at speed —
            without opening github.com a single time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">
                Get started <ArrowRight className="h-4 w-4"/>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer">
                Create a GitHub token
              </a>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Zap, title: "Bulk visibility toggles", body: "Select dozens of repos and flip them public or private in one click — with retry built in." },
            { icon: Globe, title: "Advanced search & filter", body: "Search by name, filter by language and visibility, sort by stars, forks, or updated date." },
            { icon: ShieldCheck, title: "Secure token handling", body: "Your PAT stays in your browser. No servers, no databases, no telemetry on your repos." },
            { icon: Lock, title: "Confirmation before changes", body: "Every destructive action asks first, with a clear list of affected repos." },
            { icon: Sparkles, title: "Activity log", body: "Audit every visibility change with timestamps — locally, on your machine." },
            { icon: GitBranch, title: "Real GitHub API", body: "Direct, official GitHub REST v2022-11-28. What you see is what's in your account." },
          ].map((f, i) => (
            <div key={f.title} className="hover-lift animate-fade-in rounded-lg border border-border bg-card p-5 shadow-card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
                <f.icon className="h-4 w-4"/>
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
