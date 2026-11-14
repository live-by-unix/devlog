import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { ErrorBox } from "../components/ui";
import { Field } from "../components/Forms";

export function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/auth/login", { method: "POST", body: form });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">Welcome back.</p>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        {error && <ErrorBox message={error} />}
        <Field label="Username" required>
          <input className="input" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} autoComplete="username" required />
        </Field>
        <Field label="Password" required>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="current-password" required />
        </Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        No account? <Link to="/register" className="text-brand-600 hover:underline dark:text-brand-400">Register</Link>
      </p>
    </div>
  );
}

export function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/auth/register", { method: "POST", body: form });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="mt-1 text-sm text-zinc-500">Join the community.</p>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        {error && <ErrorBox message={error} />}
        <Field label="Username" required hint="3–32 chars: letters, numbers, . _ -">
          <input className="input" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} autoComplete="username" required minLength={3} />
        </Field>
        <Field label="Password" required hint="At least 10 chars with a letter and a number.">
          <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="Confirm password" required>
          <input className="input" type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} autoComplete="new-password" required />
        </Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Register"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Have an account? <Link to="/login" className="text-brand-600 hover:underline dark:text-brand-400">Sign in</Link>
      </p>
    </div>
  );
}
