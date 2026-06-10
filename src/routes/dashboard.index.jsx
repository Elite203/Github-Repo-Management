import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { fetchAllRepos } from "@/lib/github";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { StatsCards } from "@/components/stats-cards";
import { RepoTable } from "@/components/repo-table";
import { Button } from "@/components/ui/button";

export function RepositoriesPage() {
  const { token, user } = useGithubAuth();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["repos", user?.login],
    queryFn: () => fetchAllRepos(token),
    enabled: !!token,
    retry: 2,
    staleTime: 60_000,
  });
  const repos = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Repositories</h2>
          <p className="text-sm text-muted-foreground">
            {user ? `Signed in as @${user.login}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}/>
          Refresh
        </Button>
      </div>

      <StatsCards repos={repos} loading={isLoading}/>

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive"/>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load repositories</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <RepoTable repos={repos} loading={isLoading}/>
      )}
    </div>
  );
}
