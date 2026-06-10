import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GitBranch, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useActivityLog } from "@/hooks/use-activity-log";

export function AuthPage() {
  const { signIn, token, loading } = useGithubAuth();
  const { log } = useActivityLog();
  const navigate = useNavigate();
  const [pat, setPat] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token)
      navigate({ to: "/dashboard" });
  }, [loading, token, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pat.trim())
      return;
    setSubmitting(true);
    try {
      const user = await signIn(pat.trim());
      log({ type: "auth", message: `Signed in as @${user.login}` });
      toast.success(`Welcome, ${user.name || user.login}`);
      navigate({ to: "/dashboard" });
    }
    catch (err) {
      toast.error(err.message || "Invalid token");
    }
    finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary text-primary-foreground">
            <GitBranch className="h-4 w-4"/>
          </div>
          <span className="font-semibold">RepoCtrl</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-12">
        <div className="w-full animate-scale-in rounded-xl border border-border bg-card p-6 shadow-elegant">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
              <KeyRound className="h-5 w-5"/>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Connect your GitHub</h1>
              <p className="text-xs text-muted-foreground">Paste a Personal Access Token to begin.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pat">GitHub Personal Access Token</Label>
              <Input id="pat" type="password" placeholder="ghp_… or github_pat_…" value={pat} onChange={(e) => setPat(e.target.value)} autoComplete="off" required minLength={20}/>
              <p className="text-xs text-muted-foreground">
                Needs <code className="rounded bg-muted px-1 py-0.5 text-[10px]">repo</code> scope (classic) or
                Administration: Read &amp; write (fine-grained) to change visibility.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Continue
            </Button>
          </form>

          <div className="mt-5 flex gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success"/>
            <span>
              Your token is stored only in this browser's local storage. RepoCtrl talks to GitHub
              directly — nothing is sent to our servers.
            </span>
          </div>

          <div className="mt-4 text-center text-xs">
            <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Create a fine-grained token on GitHub →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
