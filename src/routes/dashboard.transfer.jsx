import { useCallback, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  FileIcon,
  FolderInput,
  FolderOpen,
  Loader2,
  AlertCircle,
  UploadCloud,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAllRepos, getFileSha, uploadFile } from "@/lib/github";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ─── constants ───────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB – GitHub Contents API limit

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Returns the repo-relative path for a picked file. */
function relativePath(file, stripRoot) {
  const rel = file.webkitRelativePath || file.name;
  if (!stripRoot) return rel;
  const parts = rel.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : rel;
}

// ─── file tree ───────────────────────────────────────────────────────────────
function buildTree(files) {
  const root = {};
  for (const f of files) {
    const parts = (f.webkitRelativePath || f.name).split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = { __dir: true, __children: {} };
      node = node[parts[i]].__children;
    }
    node[parts[parts.length - 1]] = { __file: true, ref: f };
  }
  return root;
}

function TreeNode({ name, node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const pad = depth * 14;

  if (node.__file) {
    return (
      <div
        className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground"
        style={{ paddingLeft: pad + 4 }}
      >
        <FileIcon className="h-3 w-3 shrink-0" />
        <span className="truncate">{name}</span>
        <span className="ml-auto shrink-0 text-[10px] opacity-60">
          {formatBytes(node.ref.size)}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 py-0.5 text-xs font-medium hover:text-foreground"
        style={{ paddingLeft: pad }}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <FolderOpen className="h-3 w-3 shrink-0 text-yellow-500" />
        <span className="truncate">{name}</span>
      </button>
      {open && node.__children && (
        <div>
          {Object.entries(node.__children).map(([k, v]) => (
            <TreeNode key={k} name={k} node={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── status icons ─────────────────────────────────────────────────────────────
const STATUS_ICON = {
  pending:  <span className="h-3 w-3 rounded-full border border-muted-foreground inline-block" />,
  uploading:<Loader2 className="h-3 w-3 animate-spin text-primary" />,
  done:     <CheckCircle2 className="h-3 w-3 text-green-500" />,
  skipped:  <AlertCircle className="h-3 w-3 text-yellow-500" />,
  error:    <AlertCircle className="h-3 w-3 text-destructive" />,
};

// ─── searchable repo picker ───────────────────────────────────────────────────
function RepoCombobox({ repos, loading, value, onChange }) {
  const [open, setOpen] = useState(false);
  const sorted = [...repos].sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={loading}
        >
          <span className="truncate text-left">
            {loading ? "Loading repos…" : value || "Search and select a repo…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search repository…" className="h-9" />
          <CommandList>
            <CommandEmpty>No repository found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.full_name}
                  onSelect={(val) => {
                    onChange(val === value ? "" : val);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 shrink-0 transition-opacity ${
                      value === r.full_name ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="truncate">{r.full_name}</span>
                  {r.private && (
                    <span className="ml-auto pl-2 text-[10px] text-muted-foreground">
                      private
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export function TransferPage() {
  const { token } = useGithubAuth();
  const inputRef = useRef(null);

  const { data: repos = [], isLoading: reposLoading } = useQuery({
    queryKey: ["repos"],
    queryFn: () => fetchAllRepos(token),
    enabled: !!token,
  });

  // settings
  const [targetRepo, setTargetRepo] = useState("");
  const [repoPrefix, setRepoPrefix] = useState("");
  const [commitMsg, setCommitMsg] = useState("Upload folder via Git Herder");
  const [stripRoot, setStripRoot] = useState(true);

  // files
  const [files, setFiles] = useState([]);

  // upload state
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [uploadDone, setUploadDone] = useState(false);

  const [dragging, setDragging] = useState(false);

  // ── helpers ─────────────────────────────────────
  const setStatus = (path, s) =>
    setStatuses((prev) => ({ ...prev, [path]: s }));

  const resetFiles = (newFiles) => {
    setFiles(newFiles);
    setStatuses({});
    setUploadDone(false);
  };

  // ── drag & drop ─────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);

    const items = Array.from(e.dataTransfer.items ?? []);
    const collected = [];

    const readEntry = (entry, base = "") =>
      new Promise((done) => {
        if (entry.isFile) {
          entry.getFile((f) => {
            try {
              Object.defineProperty(f, "webkitRelativePath", {
                value: base ? `${base}/${f.name}` : f.name,
                writable: false,
                configurable: true,
              });
            } catch (_) { /* already defined */ }
            collected.push(f);
            done();
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const batch = () =>
            new Promise((r) =>
              reader.readEntries(async (entries) => {
                if (!entries.length) { r(); return; }
                await Promise.all(
                  entries.map((en) =>
                    readEntry(en, base ? `${base}/${entry.name}` : entry.name)
                  )
                );
                await batch();
                r();
              })
            );
          batch().then(done);
        } else {
          done();
        }
      });

    Promise.all(
      items
        .filter((i) => i.kind === "file")
        .map((i) => {
          const entry = i.webkitGetAsEntry?.();
          return entry ? readEntry(entry) : Promise.resolve();
        })
    ).then(() => {
      if (collected.length) resetFiles(collected);
      else toast.error("No files found in the dropped item.");
    });
  }, []);

  // ── file input ──────────────────────────────────
  const onInputChange = (e) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) resetFiles(picked);
    e.target.value = "";
  };

  // ── upload ──────────────────────────────────────
  const handleUpload = async () => {
    if (!targetRepo) {
      toast.error("Please select a target repository.");
      return;
    }
    if (!files.length) {
      toast.error("Please select a folder to upload.");
      return;
    }
    if (!commitMsg.trim()) {
      toast.error("Please enter a commit message.");
      return;
    }

    setUploading(true);
    setUploadDone(false);

    // initialise all statuses
    const init = {};
    files.forEach((f) => { init[relativePath(f, stripRoot)] = "pending"; });
    setStatuses(init);

    const prefix = repoPrefix.trim().replace(/^\/+|\/+$/g, "");
    let ok = 0, fail = 0;

    const uploadId = toast.loading(`Uploading ${files.length} files to ${targetRepo}…`);

    for (const file of files) {
      const rel = relativePath(file, stripRoot);
      const repoPath = prefix ? `${prefix}/${rel}` : rel;

      if (file.size > MAX_FILE_BYTES) {
        setStatus(rel, "skipped");
        toast.warning(`Skipped (>25 MB): ${file.name}`, { id: undefined });
        continue;
      }

      setStatus(rel, "uploading");
      try {
        const b64 = await readFileAsBase64(file);
        const sha = await getFileSha(token, targetRepo, repoPath);
        await uploadFile(token, targetRepo, repoPath, b64, commitMsg.trim(), sha);
        setStatus(rel, "done");
        ok++;
      } catch (err) {
        setStatus(rel, "error");
        fail++;
        console.error(`[transfer] Failed ${repoPath}:`, err.message);
      }
    }

    setUploading(false);
    setUploadDone(true);

    toast.dismiss(uploadId);

    if (fail === 0) {
      toast.success(`${ok} file${ok !== 1 ? "s" : ""} successfully uploaded to ${targetRepo}`, {
        description: "View your repository on GitHub to confirm.",
        action: {
          label: "Open repo",
          onClick: () => window.open(`https://github.com/${targetRepo}`, "_blank"),
        },
        duration: 8000,
      });
    } else {
      toast.error(`${fail} file${fail !== 1 ? "s" : ""} failed to upload`, {
        description: `${ok} succeeded, ${fail} failed. Check the console for details.`,
        duration: 8000,
      });
    }
  };

  // ── derived state ───────────────────────────────
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const oversized  = files.filter((f) => f.size > MAX_FILE_BYTES);
  const tree       = files.length ? buildTree(files) : null;
  const statusVals = Object.values(statuses);
  const doneCount  = statusVals.filter((s) => s === "done").length;
  const progress   = files.length ? Math.round(((doneCount) / files.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FolderInput className="h-6 w-6 text-primary" />
          Folder Transfer
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload a local folder (including sub-folders) directly into any of your GitHub repositories.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left: drop zone + progress ── */}
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !files.length && inputRef.current?.click()}
            className={[
              "relative flex min-h-[200px] flex-col items-center justify-center",
              "rounded-xl border-2 border-dashed transition-all duration-200",
              dragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : files.length
                ? "cursor-default border-border bg-muted/20"
                : "cursor-pointer border-border bg-muted/10 hover:border-primary/60 hover:bg-primary/5",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              webkitdirectory="true"
              multiple
              onChange={onInputChange}
            />

            {files.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <UploadCloud className="h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="font-medium">Drop a folder here</p>
                  <p className="text-sm text-muted-foreground">or click to browse your local files</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                >
                  <FolderOpen className="mr-2 h-4 w-4" /> Choose folder
                </Button>
              </div>
            ) : (
              <div className="w-full p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {files.length} file{files.length !== 1 ? "s" : ""}
                    <span className="ml-2 text-xs text-muted-foreground">({formatBytes(totalSize)})</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => inputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => resetFiles([])}
                    >
                      <X className="mr-1 h-3 w-3" /> Clear
                    </Button>
                  </div>
                </div>

                {oversized.length > 0 && (
                  <div className="mb-2 flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {oversized.length} file{oversized.length !== 1 ? "s" : ""} exceed 25 MB and will be skipped
                  </div>
                )}

                <ScrollArea className="h-[240px] rounded-md border border-border bg-background px-2 py-1">
                  {tree && Object.entries(tree).map(([k, v]) => (
                    <TreeNode key={k} name={k} node={v} depth={0} />
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Upload progress panel */}
          {uploading && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Uploading…</span>
                <span className="tabular-nums text-muted-foreground">{doneCount} / {files.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <ScrollArea className="mt-2 h-[160px]">
                {Object.entries(statuses).map(([path, s]) => (
                  <div key={path} className="flex items-center gap-2 py-0.5 text-xs">
                    {STATUS_ICON[s]}
                    <span className={[
                      "truncate",
                      s === "error"   ? "text-destructive"     :
                      s === "skipped" ? "text-yellow-500"      :
                      s === "done"    ? "text-muted-foreground" : "",
                    ].join(" ")}>
                      {path}
                    </span>
                    {s === "skipped" && (
                      <Badge variant="outline" className="ml-auto text-[10px]">skipped</Badge>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Done banner */}
          {uploadDone && !uploading && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              <div className="text-sm">
                <p className="font-medium text-green-600 dark:text-green-400">Upload complete</p>
                <p className="text-xs text-muted-foreground">
                  {Object.values(statuses).filter((s) => s === "done").length} files pushed to{" "}
                  <a
                    href={`https://github.com/${targetRepo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {targetRepo}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: settings ── */}
        <div className="space-y-4 self-start rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold">Upload settings</p>

          {/* Repo picker */}
          <div className="space-y-1.5">
            <Label>Target repository</Label>
            <RepoCombobox
              repos={repos}
              loading={reposLoading}
              value={targetRepo}
              onChange={setTargetRepo}
            />
          </div>

          {/* Destination path */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-prefix">
              Destination path{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="repo-prefix"
              placeholder="e.g. src/components"
              value={repoPrefix}
              onChange={(e) => setRepoPrefix(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to upload into the repo root.
            </p>
          </div>

          {/* Strip root toggle */}
          <div className="flex items-start gap-2">
            <input
              id="strip-root"
              type="checkbox"
              checked={stripRoot}
              onChange={(e) => setStripRoot(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            />
            <div>
              <Label htmlFor="strip-root" className="cursor-pointer">
                Strip top-level folder name
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload the folder's contents instead of the folder itself.
              </p>
            </div>
          </div>

          {/* Commit message */}
          <div className="space-y-1.5">
            <Label htmlFor="commit-msg">Commit message</Label>
            <Input
              id="commit-msg"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Upload folder via Git Herder"
            />
          </div>

          {/* Info box */}
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p>• Max 25 MB per file (GitHub API limit)</p>
            <p>• Existing files are overwritten safely</p>
            <p>• Files upload one-by-one with progress</p>
          </div>

          {/* Upload button */}
          <Button
            className="w-full"
            disabled={!targetRepo || !files.length || !commitMsg.trim() || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              <><UploadCloud className="mr-2 h-4 w-4" />
                Upload {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""}` : "folder"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
