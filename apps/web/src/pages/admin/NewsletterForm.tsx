import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { api, ApiError, mediaUrl, type Newsletter } from "../../api";
import { Field, ErrorBox, Toast } from "../../components/Forms";
import { MarkdownEditor } from "../../components/MarkdownEditor";
import { Spinner } from "../../components/ui";

export default function NewsletterForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", content: "", imagePath: "", status: "draft" as "draft" | "published" });
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      api<{ newsletter: Newsletter }>(`/admin/newsletters/${id}`)
        .then(({ newsletter }) => {
          setForm({
            title: newsletter.title, description: newsletter.description,
            content: newsletter.content, imagePath: newsletter.imagePath, status: newsletter.status,
          });
          setLoading(false);
        })
        .catch((e) => { setError(e.message); setLoading(false); });
    }
  }, [id, isEdit]);

  const uploadCover = async (file: File) => {
    setUploading(true); setToast("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ path: string }>("/admin/uploads/image?kind=newsletter", { method: "POST", formData: fd });
      setForm((f) => ({ ...f, imagePath: res.path }));
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Upload failed");
    } finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      if (isEdit) await api(`/admin/newsletters/${id}`, { method: "PUT", body: form });
      else await api("/admin/newsletters", { method: "POST", body: form });
      navigate("/admin/newsletters");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/newsletters" className="btn-ghost !p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit newsletter" : "New newsletter"}</h1>
      </div>

      <div className="card space-y-4 p-6">
        <Field label="Title" required><input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
        <Field label="Short description" hint="Shown on newsletter cards.">
          <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} />
        </Field>
        <Field label="Cover image">
          <div className="flex items-center gap-4">
            {form.imagePath && <img src={mediaUrl(form.imagePath)} alt="" className="h-16 w-24 rounded-lg border object-cover" />}
            <label className="btn-outline cursor-pointer text-sm">
              <Upload size={14} />{uploading ? "Uploading…" : form.imagePath ? "Replace image" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCover(f); e.target.value = ""; }} />
            </label>
            {form.imagePath && <button type="button" className="btn-ghost text-sm text-red-500" onClick={() => setForm((f) => ({ ...f, imagePath: "" }))}>Remove</button>}
          </div>
        </Field>
        <Field label="Content (Markdown)" required>
          <MarkdownEditor value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} minHeight="20rem" />
        </Field>
        <Field label="Status">
          <select className="input max-w-xs" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "draft" | "published" }))}>
            <option value="draft">Draft — hidden from public</option>
            <option value="published">Published — visible on website</option>
          </select>
        </Field>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create newsletter"}</button>
        <Link to="/admin/newsletters" className="btn-secondary">Cancel</Link>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </form>
  );
}
