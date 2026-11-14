import { useEffect, useState } from "react";
import { api, ApiError } from "../../api";
import { Field, ErrorBox, Toast } from "../../components/Forms";
import { Spinner } from "../../components/ui";

interface Settings {
  maxUploadMb: number;
  maxImageMb: number;
  sessionTtlDays: number;
  sessionIdleHours: number;
  maintenanceMode: boolean;
}

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [meta, setMeta] = useState<{ dataDir: string; version: number } | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ settings: Settings }>("/admin/settings"),
      api<any>("/admin/stats"),
    ]).then(([s, st]) => { setSettings(s.settings); setMeta({ dataDir: st.dataDir, version: st.installation.version }); })
      .catch((e) => setError(e.message));
  }, []);

  if (!settings) return error ? <ErrorBox message={error} /> : <Spinner />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      await api("/admin/settings", { method: "PUT", body: settings });
      setToast("Settings saved.");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Save failed");
    } finally { setBusy(false); }
  };

  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings((s) => s && { ...s, [k]: parseInt(e.target.value, 10) || 0 });

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-500">Application configuration.</p>
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold">Uploads & sessions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Max file upload (MB)"><input className="input" type="number" min={1} max={2048} value={settings.maxUploadMb} onChange={num("maxUploadMb")} /></Field>
          <Field label="Max image size (MB)"><input className="input" type="number" min={1} max={100} value={settings.maxImageMb} onChange={num("maxImageMb")} /></Field>
          <Field label="Session lifetime (days)"><input className="input" type="number" min={1} max={365} value={settings.sessionTtlDays} onChange={num("sessionTtlDays")} /></Field>
          <Field label="Session idle timeout (hours)"><input className="input" type="number" min={1} max={720} value={settings.sessionIdleHours} onChange={num("sessionIdleHours")} /></Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings((s) => s && { ...s, maintenanceMode: e.target.checked })} className="h-4 w-4 rounded border-zinc-300" />
          Maintenance mode — block public write operations
        </label>
      </div>

      <div className="card p-6 text-sm">
        <h2 className="font-semibold">Installation</h2>
        <dl className="mt-3 space-y-2 text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between"><dt>Installation version</dt><dd className="font-mono">{meta?.version ?? "—"}</dd></div>
          <div className="flex justify-between"><dt>Data directory</dt><dd className="font-mono text-xs">{meta?.dataDir ?? "—"}</dd></div>
          <div className="flex justify-between"><dt>Storage</dt><dd>JSON files (no external database)</dd></div>
        </dl>
        <p className="mt-4 text-xs text-zinc-500">
          Warning: deleting the <code>data/</code> directory destroys all users, releases, newsletters, discussions and uploads. See docs/BACKUPS.md before doing so.
        </p>
      </div>

      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
      {toast && <Toast message={toast} kind={toast.includes("saved") ? "success" : "error"} onClose={() => setToast("")} />}
    </form>
  );
}
