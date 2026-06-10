import { useMemo, useState } from "react";
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink,
  GitFork, Globe, Link2, Lock, Search, Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { setRepoVisibility } from "@/lib/github";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useActivityLog } from "@/hooks/use-activity-log";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** Normalises a URL so it always has a protocol */
function normaliseUrl(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function WebsiteCell({ homepage }) {
  const url = normaliseUrl(homepage);

  if (!url) {
    return <span className="text-xs text-muted-foreground">N/A</span>;
  }

  // Strip protocol for display
  const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline max-w-[140px] truncate"
          >
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{display}</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs break-all text-xs">
          {url}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function RepoTable({ repos, loading }) {
  const { token } = useGithubAuth();
  const { log } = useActivityLog();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [language, setLanguage] = useState("all");
  const [sortKey, setSortKey] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set());
  const [pending, setPending] = useState(null);

  const languages = useMemo(() => {
    const set = new Set();
    repos.forEach((r) => r.language && set.add(r.language));
    return Array.from(set).sort();
  }, [repos]);

  const filtered = useMemo(() => {
    let list = repos;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.full_name.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (visibility !== "all") {
      list = list.filter((r) => (visibility === "private" ? r.private : !r.private));
    }
    if (language !== "all") {
      list = list.filter((r) => r.language === language);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":    return a.name.localeCompare(b.name) * dir;
        case "stars":   return (a.stargazers_count - b.stargazers_count) * dir;
        case "forks":   return (a.forks_count - b.forks_count) * dir;
        case "updated": return (new Date(a.updated_at) - new Date(b.updated_at)) * dir;
        default:        return 0;
      }
    });
    return list;
  }, [repos, search, visibility, language, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRepos = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const allPageSelected = pageRepos.length > 0 && pageRepos.every((r) => selected.has(r.id));
  const togglePageSelection = () => {
    const next = new Set(selected);
    if (allPageSelected) pageRepos.forEach((r) => next.delete(r.id));
    else pageRepos.forEach((r) => next.add(r.id));
    setSelected(next);
  };

  const mutation = useMutation({
    mutationFn: async ({ repos: list, makePrivate }) => {
      if (!token) throw new Error("Not authenticated");
      const results = await Promise.allSettled(
        list.map((r) => setRepoVisibility(token, r.full_name, makePrivate))
      );
      return { results, list, makePrivate };
    },
    retry: 1,
    onSuccess: ({ results, list, makePrivate }) => {
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast.success(`${ok} repo${ok > 1 ? "s" : ""} set to ${makePrivate ? "private" : "public"}`);
        log({
          type: list.length > 1 ? "bulk" : "visibility",
          message: `Set ${ok} repo${ok > 1 ? "s" : ""} to ${makePrivate ? "private" : "public"}`,
          meta: { names: list.map((r) => r.full_name) },
        });
      }
      if (fail > 0) {
        const errs = results
          .map((r, i) => r.status === "rejected" ? `${list[i].name}: ${r.reason.message}` : null)
          .filter(Boolean)
          .join("; ");
        toast.error(`${fail} failed: ${errs}`);
        log({ type: "error", message: `Failed: ${errs}` });
      }
      qc.invalidateQueries({ queryKey: ["repos"] });
      setSelected(new Set());
    },
    onError: (e) => {
      toast.error(e.message);
      log({ type: "error", message: e.message });
    },
  });

  const requestChange = (list, makePrivate) => {
    if (list.length === 0) return;
    setPending({ repos: list, makePrivate });
  };

  const selectedRepos = useMemo(
    () => repos.filter((r) => selected.has(r.id)),
    [repos, selected]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={visibility} onValueChange={(v) => { setVisibility(v); setPage(1); }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="public">Public only</SelectItem>
              <SelectItem value="private">Private only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={language} onValueChange={(v) => { setLanguage(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-accent/50 px-3 py-2 animate-scale-in">
          <span className="text-sm"><strong>{selected.size}</strong> selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" variant="outline" onClick={() => requestChange(selectedRepos, false)}>
              <Globe className="mr-1 h-3.5 w-3.5" /> Make public
            </Button>
            <Button size="sm" onClick={() => requestChange(selectedRepos, true)}>
              <Lock className="mr-1 h-3.5 w-3.5" /> Make private
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={togglePageSelection} aria-label="Select page" />
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Repository <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">
                  <button onClick={() => toggleSort("stars")} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Star className="h-3 w-3" /> Stars
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button onClick={() => toggleSort("forks")} className="inline-flex items-center gap-1 hover:text-foreground">
                    <GitFork className="h-3 w-3" /> Forks
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("updated")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Updated <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> Website
                  </span>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                : pageRepos.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      No repositories match your filters.
                    </TableCell>
                  </TableRow>
                )
                : pageRepos.map((r) => {
                    const checked = selected.has(r.id);
                    return (
                      <TableRow
                        key={r.id}
                        data-state={checked ? "selected" : undefined}
                        className="transition-colors hover:bg-accent/40"
                      >
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = new Set(selected);
                              if (v) next.add(r.id); else next.delete(r.id);
                              setSelected(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 font-medium">
                              {r.name}
                              {r.archived && <Badge variant="outline" className="text-[10px]">archived</Badge>}
                              {r.fork && <Badge variant="outline" className="text-[10px]">fork</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {r.description || `${r.owner.login}/${r.name}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!r.private}
                              disabled={mutation.isPending}
                              onCheckedChange={(checkedOn) => requestChange([r], !checkedOn)}
                              aria-label="Toggle visibility"
                            />
                            <Badge variant={r.private ? "secondary" : "default"} className="gap-1">
                              {r.private ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                              {r.private ? "Private" : "Public"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.language
                            ? <span className="text-xs">{r.language}</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.stargazers_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.forks_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <WebsiteCell homepage={r.homepage} />
                        </TableCell>
                        <TableCell>
                          <a
                            href={r.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Open on GitHub"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-3 py-2 sm:flex-row">
          <div className="text-xs text-muted-foreground">
            Showing {pageRepos.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
            {(safePage - 1) * pageSize + pageRepos.length} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums">{safePage} / {totalPages}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Make {pending?.repos.length} repo{(pending?.repos.length ?? 0) > 1 ? "s" : ""}{" "}
              {pending?.makePrivate ? "private" : "public"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.makePrivate
                ? "Private repos are only visible to you and collaborators."
                : "Public repos are visible to anyone on the internet. Be sure no secrets are committed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-xs">
            {pending?.repos.map((r) => <div key={r.id} className="py-0.5">{r.full_name}</div>)}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pending) mutation.mutate(pending);
              setPending(null);
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
