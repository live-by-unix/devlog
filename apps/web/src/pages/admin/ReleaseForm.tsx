import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, Download, Lock } from "lucide-react";
import { api, ApiError, formatBytes, formatDate, type Release, type Newsletter, type Paginated } from "../../api";
import { Field, ErrorBox, Toast, ConfirmDialog } from "../../components/Forms";
import { MarkdownEditor } from "../../components/MarkdownEditor";
import { Spinner, FileBadge } from "../../components/ui";

export default function ReleaseForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", version: "", description: "", githubUrl: "", newsletterId: "", status: "draft" as "draft" | "published",
  });
  const [files, setFiles] = useState<Release["files"]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: Newsletter[] }>("/admin/newsletters?pageSize=100").then((r) => setNewsletters(r.items)).catch(() => {});
    if (isEdit) {
      api<{ release: Release }>(`/admin/releases/${id}`)
        .then(({ release }) => {
          setForm({
            name: release.name, version: release.version, description: release.description,
            githubUrl: release.githubUrl, newsletterId: release.newsletterId, status: release.status,
          });
          setFiles(release.files);
          setLoading(false);
        })
        .catch((e) => { setError(e.message); setLoading(false); });
    }
  }, [id, isEdit]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      const body = { ...form, newsletterId: form.newsletterId || "" };
      if (isEdit) {
        await api(`/admin/releases/${id}`, { method: "PUT", body });
      } else {
        await api("/admin/releases", { method: "POST", body });
      }
      navigate("/admin/releases");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  };

  const uploadFile = async (file: File, permission: "everyone" | "users") => {
    if (!isEdit) { setToast("Save the release first, then upload files."); return; }
    setUploading(true); setToast("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("permission", permission);
      const res = await api<{ file: Release["files"][number] }>(`/admin/releases/${id}/files`, { method: "POST", formData: fd });
      setFiles((f) => [...f, res.file]);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Upload failed");
    } finally { setUploading(false); }
  };

  const removeFile = async () => {
    if (!deletingFile || !isEdit) return;
    try {
      await api(`/admin/releases/${id}/files/${deletingFile}`, { method: "DELETE" });
      setFiles((f) => f.filter((x) => x.id !== deletingFile));
      setDeletingFile(null);
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/releases" className="btn-ghost !p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit release" : "New release"}</h1>
      </div>

      <div className="card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Release name" required><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></Field>
          <Field label="Version" required><input className="input" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="1.0.0" required /></Field>
        </div>
        <Field label="Description (Markdown)" required>
          <MarkdownEditor value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub Releases URL"><input className="input" type="url" value={form.githubUrl} onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))} placeholder="https://github.com/…/releases" /></Field>
          <Field label="Associated newsletter">
            <select className="input" value={form.newsletterId} onChange={(e) => setForm((f) => ({ ...f, newsletterId: e.target.value }))}>
              <option value="">None</option>
              {newsletters.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Status">
          <select className="input max-w-xs" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "draft" | "published" }))}>
            <option value="draft">Draft — hidden from public</option>
            <option value="published">Published — visible on website</option>
          </select>
        </Field>
      </div>

      {isEdit && (
        <div className="card p-6">
          <h2 className="font-semibold">Downloadable files</h2>
          <p className="mt-1 text-sm text-zinc-500">Multiple files per release. Choose who can download each file.</p>
          {files.length > 0 && (
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Download size={16} className="text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.displayName}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(f.size)} · {formatDate(f.uploadedAt)}</p>
                  </div>
                  <FileBadge permission={f.permission} />
                  <button type="button" className="btn-ghost !p-2 text-red-500" onClick={() => setDeletingFile(f.id)}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <label className="btn-outline cursor-pointer text-sm">
              <Upload size={14} />{uploading ? "Uploading…" : "Upload public file"}
              <input type="file" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f, "everyone");
                  e.target.value = "";
                }} />
            </label>
            <label className="btn-outline cursor-pointer text-sm">
              <Lock size={14} />{uploading ? "Uploading…" : "Upload sign-in-only file"}
              <input type="file" className="hidden" disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f, "users");
                  e.target.value = "";
                }} />
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create release"}</button>
        <Link to="/admin/releases" className="btn-secondary">Cancel</Link>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      <ConfirmDialog open={!!deletingFile} title="Delete file" message="This file will be removed from the release and disk." onConfirm={removeFile} onCancel={() => setDeletingFile(null)} />
    </form>
  );
}
