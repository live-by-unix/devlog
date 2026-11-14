import { useState } from "react";
import { api, ApiError, type User } from "../api";
import { useAuth } from "../auth";
import { Field, ErrorBox, Toast } from "../components/Forms";
import { formatDate } from "../api";

export default function Account() {
  const { user, refresh } = useAuth();
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <div className="mx-auto max-w-md px-4 py-16"><ErrorBox message="Please sign in to view your account." /></div>;
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setOk("");
    try {
      await api("/auth/password", { method: "POST", body: pw });
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setOk("Password updated. Other sessions were signed out.");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update password");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Account</h1>
      <div className="card mt-6 p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-500">Username</dt><dd className="font-medium">{user.username}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className="font-medium capitalize">{user.status}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-500">Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>
          {user.lastLoginAt && <div className="flex justify-between"><dt className="text-zinc-500">Last sign-in</dt><dd>{formatDate(user.lastLoginAt)}</dd></div>}
        </dl>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Change password</h2>
      <form onSubmit={changePassword} className="card mt-4 space-y-4 p-6">
        {error && <ErrorBox message={error} />}
        <Field label="Current password" required>
          <input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" required />
        </Field>
        <Field label="New password" required hint="At least 10 chars with a letter and a number.">
          <input className="input" type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="Confirm new password" required>
          <input className="input" type="password" value={pw.confirmPassword} onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))} autoComplete="new-password" required />
        </Field>
        <button className="btn-primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      </form>
      {ok && <Toast message={ok} kind="success" onClose={() => setOk("")} />}
    </div>
  );
}
