import { useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SettingsPage() {
  const { user, signOut } = useGithubAuth();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      {/* GitHub profile */}
      {user && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user.name || user.login}</p>
              <a
                href={user.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline"
              >
                @{user.login}
              </a>
              {user.bio && (
                <p className="mt-1 text-sm text-muted-foreground">{user.bio}</p>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-center">
            <div>
              <p className="text-lg font-semibold">{user.public_repos}</p>
              <p className="text-xs text-muted-foreground">Public repos</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{user.followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{user.following}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </div>
      )}

      {/* Token security notice */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-green-500" />
          <div className="flex-1">
            <p className="font-medium">Token security</p>
            <p className="text-sm text-muted-foreground">
              Your GitHub token is stored in this browser's local storage only. It is never sent to any
              third-party server. Sign out below to remove it.
            </p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-destructive">Sign out</p>
            <p className="text-sm text-muted-foreground">
              Remove your stored GitHub token from this browser.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
