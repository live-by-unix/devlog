import { useEffect, useState } from "react";
import { api, ApiError, mediaUrl, type Project } from "../../api";
import { Field, ErrorBox, Toast } from "../../components/Forms";
import { Spinner } from "../../components/ui";
import { PROJECT_TYPES, LICENSES } from "@devlog/shared";
import { useAuth } from "../../auth";
import { Upload } from "lucide-react";

export default function ProjectSettings() {
  const { refresh } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    api<{ project: Project }>("/project").then((r) => setProject(r.project)).catch((e) => setError(e.message));
  }, []);

  if (!project) return error ? <ErrorBox message={error} /> : <Spinner />;

  const set = (k: keyof Project) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setProject((p) => p && { ...p, [k]: e.target.value });

  const uploadImage = async (kind: "favicon" | "project", file: File) => {
    setUploading(kind); setToast("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ path: string }>(`/admin/uploads/image?kind=${kind}`, { method: "POST", formData: fd });
      setProject((p) => p && { ...p, [kind === "favicon" ? "faviconPath" : "imagePath"]: res.path });
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Upload failed");
    } finally { setUploading(""); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      const payload = {
        ...project,
        license: project.license === "Other" ? (project.customLicense || "Other") : project.license,
      };
      await api("/admin/project", { method: "PUT", body: payload });
      await refresh();
      setToast("Project settings saved.");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project settings</h1>
        <p className="text-sm text-zinc-500">This information is shown on the public website.</p>
      </div>

      <div className="card space-y-4 p-6">
        <Field label="Program name" required><input className="input" value={project.name} onChange={set("name")} required /></Field>
        <Field label="Description"><textarea className="input" rows={4} value={project.description} onChange={set("description")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required>
            <select className="input" value={PROJECT_TYPES.includes(project.type as never) ? project.type : project.type === "Custom" ? "Custom" : "Other"} onChange={(e) => {
              const v = e.target.value;
              setProject((p) => p && { ...p, type: v === "Other" ? "" : v === "Custom" ? "Custom" : v });
            }}>
              {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              <option value="Custom">Custom…</option>
              <option value="Other">Other (type below)</option>
            </select>
          </Field>
          <Field label="License" required>
            <select className="input" value={project.license} onChange={set("license")}>
              {LICENSES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        {(project.type === "Custom" || (project.type && !PROJECT_TYPES.includes(project.type as never))) && (
          <Field label="Custom type"><input className="input" value={project.type === "Custom" ? "" : project.type} onChange={set("type")} placeholder="e.g. Daemon, Widget, SDK" /></Field>
        )}
        {project.license === "Other" && (
          <Field label="Custom license"><input className="input" value={project.customLicense} onChange={set("customLicense")} placeholder="e.g. BUSL-1.1" /></Field>
        )}
        <Field label="Made by"><input className="input" value={project.author} onChange={set("author")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website URL"><input className="input" type="url" value={project.websiteUrl} onChange={set("websiteUrl")} placeholder="https://" /></Field>
          <Field label="GitHub repository"><input className="input" type="url" value={project.repositoryUrl} onChange={set("repositoryUrl")} placeholder="https://github.com/…" /></Field>
          <Field label="Store page"><input className="input" type="url" value={project.storeUrl} onChange={set("storeUrl")} placeholder="https://" /></Field>
          <Field label="Developer GitHub"><input className="input" type="url" value={project.developerGithub} onChange={set("developerGithub")} placeholder="https://github.com/…" /></Field>
        </div>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold">Images</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Favicon</p>
            <div className="flex items-center gap-3">
              {project.faviconPath ? <img src={mediaUrl(project.faviconPath)} alt="" className="h-10 w-10 rounded border" /> : <div className="h-10 w-10 rounded border border-dashed" />}
              <label className="btn-outline cursor-pointer text-sm">
                <Upload size={14} />{uploading === "favicon" ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading}
                  onChange={(e) => e.target.files?.[0] && uploadImage("favicon", e.target.files[0])} />
              </label>
            </div>
          </div>
          <div>
            <p className="label">Product image</p>
            <div className="flex items-center gap-3">
              {project.imagePath ? <img src={mediaUrl(project.imagePath)} alt="" className="h-10 w-16 rounded border object-cover" /> : <div className="h-10 w-16 rounded border border-dashed" />}
              <label className="btn-outline cursor-pointer text-sm">
                <Upload size={14} />{uploading === "project" ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading}
                  onChange={(e) => e.target.files?.[0] && uploadImage("project", e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save project settings"}</button>
      {toast && <Toast message={toast} kind={toast.includes("saved") ? "success" : "error"} onClose={() => setToast("")} />}
    </form>
  );
}
