import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Pencil, Trash2, Flag, Send, MessageSquare } from "lucide-react";
import {
  api, type Thread, type Reply, type Paginated, type Release, type Newsletter,
} from "../api";
import { useAuth } from "../auth";
import {
  Markdown, Spinner, ErrorBox, EmptyState, ThreadRow,
} from "../components/ui";
import { Field, ConfirmDialog, Toast } from "../components/Forms";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { formatDate } from "../api";

/* ------------------------------ board (threads) ---------------------------- */

export function DiscussionBoard({ scope, targetId }: { scope: "release" | "newsletter"; targetId: string }) {
  const { user, refresh: refreshAuth } = useAuth();
  const [data, setData] = useState<Paginated<Thread> | null>(null);
  const [targetName, setTargetName] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    api<Paginated<Thread>>(`/discussions/threads?scope=${scope}&targetId=${targetId}&page=${page}&pageSize=20`)
      .then(setData).catch((e) => setError(e.message));
  }, [scope, targetId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const endpoint = scope === "release" ? `/releases/${targetId}` : `/newsletters/${targetId}`;
    api<{ release?: Release; newsletter?: Newsletter }>(endpoint)
      .then((r) => setTargetName(r.release?.name ?? r.newsletter?.title ?? ""))
      .catch(() => {});
  }, [scope, targetId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      await api("/discussions/threads", { method: "POST", body: { scope, targetId, ...form } });
      setForm({ title: "", content: "" });
      setShowForm(false);
      load();
      void refreshAuth();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to post");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-4 text-sm text-zinc-500">
        <Link to="/discussions" className="hover:underline">Discussions</Link> / {targetName || "…"}
      </nav>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{targetName || "Discussion"}</h1>
          <p className="mt-1 text-zinc-500">{scope === "release" ? "Release" : "Newsletter"} discussion board</p>
        </div>
        {user && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "New thread"}
          </button>
        )}
      </div>

      {!user && (
        <div className="card mt-6 border-brand-200 p-4 text-sm dark:border-brand-900">
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">Sign in</Link>
          {" "}or <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">register</Link> to start a thread or reply.
        </div>
      )}

      {showForm && user && (
        <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
          <Field label="Title" required>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} minLength={3} maxLength={200} required />
          </Field>
          <Field label="Content" required>
            <MarkdownEditor value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} minHeight="10rem" />
          </Field>
          <button className="btn-primary" disabled={busy}>{busy ? "Posting…" : "Post thread"}</button>
        </form>
      )}

      {error && <div className="mt-6"><ErrorBox message={error} /></div>}
      {!data && !error && <Spinner />}
      {data && data.items.length === 0 && (
        <div className="mt-8"><EmptyState title="No threads yet" hint={user ? "Be the first to start a discussion." : "Sign in to start the conversation."} /></div>
      )}
      {data && data.items.length > 0 && (
        <div className="mt-6 space-y-3">
          {data.items.map((t) => <ThreadRow key={t.id} thread={t} />)}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`btn-secondary !px-3 !py-1.5 text-sm ${p === page ? "!bg-brand-600 !text-white" : ""}`}>{p}</button>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

/* ------------------------------ thread detail ------------------------------ */

function ReplyNode({ reply, depth, threadId, onChanged, onReply }: {
  reply: Reply; depth: number; threadId: string; onChanged: () => void;
  onReply: (parentId: string) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(reply.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAuthor = user?.id && reply.authorId === user.id;
  const isAdmin = user?.role === "admin";

  const save = async () => {
    setBusy(true);
    try {
      await api(`/discussions/replies/${reply.id}`, { method: "PATCH", body: { content } });
      setEditing(false);
      onChanged();
    } finally { setBusy(false); }
  };

  const del = async () => {
    setBusy(true);
    try {
      await api(`/discussions/replies/${reply.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      onChanged();
    } finally { setBusy(false); }
  };

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800 md:ml-10" : ""}>
      <div className="card p-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{reply.authorUsername}</span>
          <span>{formatDate(reply.createdAt)}{reply.editedAt ? " · edited" : ""}</span>
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <MarkdownEditor value={content} onChange={setContent} minHeight="8rem" />
            <div className="flex gap-2">
              <button className="btn-primary !py-1.5 text-sm" onClick={save} disabled={busy}>Save</button>
              <button className="btn-secondary !py-1.5 text-sm" onClick={() => { setEditing(false); setContent(reply.content); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mt-2"><Markdown content={reply.content} /></div>
        )}
        {user && !editing && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            {depth < 4 && <button className="text-brand-600 hover:underline dark:text-brand-400" onClick={() => onReply(reply.id)}>Reply</button>}
            {(isAuthor || isAdmin) && <button className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => setEditing(true)}><Pencil size={12} />Edit</button>}
            {(isAuthor || isAdmin) && <button className="flex items-center gap-1 text-red-500 hover:underline" onClick={() => setConfirmDelete(true)}><Trash2 size={12} />Delete</button>}
          </div>
        )}
      </div>
      {(reply.children ?? []).map((c) => (
        <ReplyNode key={c.id} reply={c} depth={depth + 1} threadId={threadId} onChanged={onChanged} onReply={onReply} />
      ))}
      <ConfirmDialog open={confirmDelete} title="Delete reply" message="This reply will be permanently removed." onConfirm={del} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}

export function ThreadDetail({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const load = useCallback(() => {
    api<{ thread: Thread; replies: Reply[] }>(`/discussions/threads/${threadId}`)
      .then((r) => { setThread(r.thread); setReplies(r.replies); })
      .catch((e) => setError(e.message));
  }, [threadId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const isAuthor = user?.id && thread?.authorId === user.id;
  const isAdmin = user?.role === "admin";

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      await api(`/discussions/threads/${threadId}/replies`, { method: "POST", body: { content: replyText, parentId } });
      setReplyText(""); setParentId("");
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to reply");
    } finally { setBusy(false); }
  };

  const deleteThread = async () => {
    setBusy(true);
    try {
      await api(`/discussions/threads/${threadId}`, { method: "DELETE" });
      window.history.back();
    } finally { setBusy(false); }
  };

  const submitReport = async () => {
    if (!thread || !user) return;
    setBusy(true);
    try {
      await api("/discussions/reports", { method: "POST", body: { targetType: "thread", targetId: thread.id, reason: reportReason } });
      setReportOpen(false); setReportReason("");
      setToast("Report submitted. Thank you.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to report");
    } finally { setBusy(false); }
  };

  if (error) return <div className="mx-auto max-w-4xl px-4 py-16"><ErrorBox message={error} /></div>;
  if (!thread) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to={`/discussions/${thread.scope}/${thread.targetId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />Back to discussion
      </Link>
      <article className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{thread.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              by {thread.authorUsername} · {formatDate(thread.createdAt)} · {thread.replyCount} repl{thread.replyCount === 1 ? "y" : "ies"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {thread.locked && <span className="badge bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"><Lock size={11} className="mr-1" />Locked</span>}
          </div>
        </div>
        <div className="mt-4"><Markdown content={thread.content} /></div>
        {user && (
          <div className="mt-4 flex items-center gap-3 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-800">
            {(isAuthor || isAdmin) && (
              <button className="flex items-center gap-1 text-red-500 hover:underline" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={12} />Delete thread
              </button>
            )}
            {user.role !== "admin" && thread.authorId !== user.id && (
              <button className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => setReportOpen(true)}>
                <Flag size={12} />Report
              </button>
            )}
          </div>
        )}
      </article>

      {/* Replies */}
      <div className="mt-6 space-y-4">
        {replies.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No replies yet.</p>}
        {replies.map((r) => (
          <ReplyNode key={r.id} reply={r} depth={0} threadId={thread.id} onChanged={load} onReply={(pid) => {
            setParentId(pid);
            document.getElementById("reply-box")?.scrollIntoView({ behavior: "smooth" });
          }} />
        ))}
      </div>

      {/* Reply form */}
      {user ? (
        thread.locked && user.role !== "admin" ? (
          <div className="card mt-6 p-4 text-sm text-zinc-500">This thread is locked.</div>
        ) : (
          <form id="reply-box" onSubmit={submitReply} className="card mt-6 space-y-3 p-5">
            <h2 className="font-semibold">Reply{parentId ? " (to a nested reply)" : ""}</h2>
            {parentId && <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setParentId("")}>Cancel nested reply</button>}
            <MarkdownEditor value={replyText} onChange={setReplyText} minHeight="8rem" placeholder="Write your reply in Markdown…" />
            <button className="btn-primary" disabled={busy || !replyText.trim()}>
              <Send size={15} />{busy ? "Posting…" : "Post reply"}
            </button>
          </form>
        )
      ) : (
        <div className="card mt-6 p-4 text-sm">
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">Sign in</Link>
          {" "}to join this discussion.
        </div>
      )}

      <ConfirmDialog open={confirmDelete} title="Delete thread" message="The thread and its replies will be removed from public view." onConfirm={deleteThread} onCancel={() => setConfirmDelete(false)} />

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-6">
            <h2 className="font-semibold">Report thread</h2>
            <p className="mt-1 text-sm text-zinc-500">Tell the moderators why this content violates the rules.</p>
            <textarea className="input mt-3" rows={4} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Reason…" />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setReportOpen(false)}>Cancel</button>
              <button className="btn-danger" disabled={busy || reportReason.trim().length < 3} onClick={submitReport}>Submit report</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} kind={toast.includes("Thank") ? "success" : "error"} onClose={() => setToast("")} />}
    </div>
  );
}
