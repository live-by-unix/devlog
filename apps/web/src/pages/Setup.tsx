import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";
import { api, ApiError, type Project } from "../api";
import { useAuth } from "../auth";
import { Field, Toast } from "../components/Forms";
import { PROJECT_TYPES, LICENSES } from "@devlog/shared";

export default function Setup() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [account, setAccount] = useState({ username: "", password: "", confirmPassword: "" });
  const [project, setProject] = useState<Project>({
    name: "", description: "", type: "Application", license: "MIT", customLicense: "",
    repositoryUrl: "", websiteUrl: "", storeUrl: "", author: "",
    developerGithub: "", faviconPath: "", imagePath: "",
  });

  const set = (k: keyof typeof account) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAccount((a) => ({ ...a, [k]: e.target.value }));
  const setP = (k: keyof Project) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setProject((p) => ({ ...p, [k]: e.target.value }));

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      await api("/setup", { method: "POST", body: account });
      await refresh();
      setStep(2);
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Setup failed");
    } finally { setBusy(false); }
  };

  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setToast("");
    try {
      const payload = { ...project, license: project.license === "Other" ? project.customLicense || "Other" : project.license };
      await api("/setup/project", { method: "POST", body: payload });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Failed to save project");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-brand-600 p-2.5 text-white"><Rocket size={22} /></div>
          <div>
            <h1 className="text-xl font-bold">Welcome to Devlog</h1>
            <p className="text-sm text-zinc-500">{step === 1 ? "Step 1 of 2 — Create the administrator account" : "Step 2 of 2 — Configure your project"}</p>
          </div>
        </div>
        <div className="mb-6 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />
        </div>

        {step === 1 ? (
          <form onSubmit={submitAccount} className="space-y-4">
            <Field label="Username" required>
              <input className="input" value={account.username} onChange={set("username")} autoComplete="username" required minLength={3} />
            </Field>
            <Field label="Password" required hint="At least 10 characters, with a letter and a number.">
              <input className="input" type="password" value={account.password} onChange={set("password")} autoComplete="new-password" required minLength={10} />
            </Field>
            <Field label="Confirm password" required>
              <input className="input" type="password" value={account.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" required />
            </Field>
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create admin account"}</button>
          </form>
        ) : (
          <form onSubmit={submitProject} className="space-y-4">
            <Field label="Program name" required><input className="input" value={project.name} onChange={setP("name")} required /></Field>
            <Field label="Description"><textarea className="input" rows={3} value={project.description} onChange={setP("description")} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <select className="input" value={project.type} onChange={setP("type")}>
                  {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="License" required>
                <select className="input" value={project.license} onChange={setP("license")}>
                  {LICENSES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </div>
            {project.license === "Other" && (
              <Field label="Custom license name"><input className="input" value={project.customLicense} onChange={setP("customLicense")} placeholder="e.g. BUSL-1.1" /></Field>
            )}
            <Field label="Made by (company / organization / individual)"><input className="input" value={project.author} onChange={setP("author")} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Website URL"><input className="input" type="url" value={project.websiteUrl} onChange={setP("websiteUrl")} placeholder="https://" /></Field>
              <Field label="GitHub repository"><input className="input" type="url" value={project.repositoryUrl} onChange={setP("repositoryUrl")} placeholder="https://github.com/…" /></Field>
              <Field label="Store page"><input className="input" type="url" value={project.storeUrl} onChange={setP("storeUrl")} placeholder="https://" /></Field>
              <Field label="Developer GitHub"><input className="input" type="url" value={project.developerGithub} onChange={setP("developerGithub")} placeholder="https://github.com/…" /></Field>
            </div>
            <p className="text-xs text-zinc-500">You can upload a favicon and product image later from the admin dashboard.</p>
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Finish setup"}</button>
          </form>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
