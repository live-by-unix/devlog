import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Lock, Unlock, Trash2, Flag } from "lucide-react";
import { api, type Paginated, type Thread, type Release, type Newsletter } from "../../api";
import { Spinner, ErrorBox, Pagination, ConfirmDialog, Toast, Field } from "./shared-admin-extra";
import { Markdown } from "../../components/Markdown";
import { formatDate } from "../../api";

export default function DiscussionsAdmin() {
  const [tab, setTab] = useState<"threads" | "reports">("threads");
  const [threads, setThreads] = useState<Paginated<Thread> | null>(null);
  const [reports, setReports] = useState<Paginated<any> | null>(null);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState("");
  const [reportStatus, setReportStatus] = useState("open");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [viewing, setViewing] = useState<Thread | null>(null);
  const [deleting, setDeleting] = useState<Thread | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  const loadThreads = () => {
    const q = scope ? `&scope=${scope}` : "";
    api<Paginated<Thread>>(`/admin/threads?page=${page}&pageSize=20${q}`).then(setThreads).catch((e) => setError(e.message));
  };
  const loadReports = () => {
    api<Paginated<any>>(`/admin/reports?page=${page}&pageSize=20&status=${reportStatus}`).then(setReports).catch((e) => setError(e.message));
  };

  useEffect(() => { setPage(1); }, [tab, scope, reportStatus]);
  useEffect(() => { tab === "threads" ? loadThreads() : loadReports(); }, [tab, page, scope, reportStatus]);

  // resolve target names for display
  useEffect(() => {
    if (!threads) return;
    const missing = threads.items.filter((t) => !names.has(`${t.scope}:${t.targetId}`));
    if (!missing.length) return;
    Promise.all(missing.map(async (t) => {
      try {
        if (t.scope === "release") {
          const r = await api<{ release: Release }>(`/admin/releases/${t.targetId}`);
          return [`${t.scope}:${t.targetId}`, r.release.name] as const;
        }
        const n = await api<{ newsletter: Newsletter }>(`/admin/newsletters/${t.targetId}`);
        return [`${t.scope}:${t.targetId}`, n.newsletter.title] as const;
      } catch { return [`${t.scope}:${t.targetId}`, "(deleted)"] as const; }
    })).then((entries) => setNames((m) => new Map([...m, ...entries])));
  }, [threads]);

  const toggleLock = async (t: Thread) => {
    try {
      await api(`/admin/threads/${t.id}/lock`, { method: "PATCH", body: { locked: !t.locked } });
      loadThreads();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  const removeThread = async () => {
    if (!deleting) return;
    try {
      await api(`/admin/threads/${deleting.id}`, { method: "DELETE" });
      setDeleting(null); loadThreads();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  const resolveReport = async (id: string, status: string) => {
    try {
      await api(`/admin/reports/${id}`, { method: "PATCH", body: { status } });
      loadReports();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  const current = tab === "threads" ? threads : reports;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Discussions moderation</h1>
        <p className="text-sm text-zinc-500">Review threads, lock conversations and handle reports.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-zinc-200 p-0.5 dark:bg-zinc-800">
          {(["threads", "reports"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"}`}>
              {t}{tab === "reports" && reports ? ` (${reports.total})` : ""}
            </button>
          ))}
        </div>
        {tab === "threads" && (
          <select className="input !w-auto" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">All scopes</option>
            <option value="release">Releases</option>
            <option value="newsletter">Newsletters</option>
          </select>
        )}
        {tab === "reports" && (
          <select className="input !w-auto" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        )}
      </div>

      {error && <ErrorBox message={error} />}
      {!current && !error && <Spinner />}

      {tab === "threads" && threads && (
        threads.items.length === 0 ? <div className="card p-10 text-center text-zinc-500">No threads.</div> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium">Thread</th>
                  <th className="px-4 py-3 font-medium">Board</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Replies</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {threads.items.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="max-w-56 truncate px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3 text-zinc-500">{names.get(`${t.scope}:${t.targetId}`) ?? "…"}</td>
                    <td className="px-4 py-3">{t.authorUsername}</td>
                    <td className="px-4 py-3">{t.replyCount}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(t.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost !p-2" title="View" onClick={() => setViewing(t)}><Eye size={15} /></button>
                        <button className="btn-ghost !p-2" title={t.locked ? "Unlock" : "Lock"} onClick={() => toggleLock(t)}>{t.locked ? <Unlock size={15} /> : <Lock size={15} />}</button>
                        <button className="btn-ghost !p-2 text-red-500" title="Delete" onClick={() => setDeleting(t)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {current && <Pagination data={current} onPage={setPage} />}

      {tab === "reports" && reports && (
        reports.items.length === 0 ? <div className="card p-10 text-center text-zinc-500">No reports.</div> : (
          <div className="space-y-3">
            {reports.items.map((r: any) => (
              <div key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{r.targetType}</span> report on <span className="font-medium">“{r.targetPreview}”</span>
                    <span className="ml-2 text-xs text-zinc-500">by reporter · {formatDate(r.createdAt)}</span>
                  </div>
                  <span className={`badge ${r.status === "open" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{r.reason}</p>
                {r.status === "open" && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-secondary !py-1.5 text-xs" onClick={() => resolveReport(r.id, "resolved")}>Mark resolved</button>
                    <button className="btn-ghost !py-1.5 text-xs" onClick={() => resolveReport(r.id, "dismissed")}>Dismiss</button>
                    <Link to={`/discussions/threads/${r.targetId}`} className="btn-ghost !py-1.5 text-xs" target="_blank">View content</Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Thread view modal */}
      {viewing && <ThreadViewModal thread={viewing} onClose={() => setViewing(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete thread" message={`Delete “${deleting?.title}”?`} onConfirm={removeThread} onCancel={() => setDeleting(null)} />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

function ThreadViewModal({ thread, onClose }: { thread: Thread; onClose: () => void }) {
  const [data, setData] = useState<{ thread: Thread; replies: any[] } | null>(null);
  useEffect(() => {
    api<{ thread: Thread; replies: any[] }>(`/discussions/threads/${thread.id}`).then(setData).catch(() => {});
  }, [thread.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold">{thread.title}</h2>
          <button className="btn-ghost !p-1" onClick={onClose}>✕</button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">by {thread.authorUsername} · {formatDate(thread.createdAt)}</p>
        <div className="mt-4"><Markdown content={thread.content} /></div>
        {data && data.replies.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {data.replies.map((r: any) => (
              <div key={r.id} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-500">{r.authorUsername} · {formatDate(r.createdAt)}</p>
                <div className="mt-1"><Markdown content={r.content} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
