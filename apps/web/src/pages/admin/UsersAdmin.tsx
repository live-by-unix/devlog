import { useEffect, useState } from "react";
import { Ban, RotateCcw, Trash2, Shield } from "lucide-react";
import { api, type Paginated, type User } from "../../api";
import { Spinner, ErrorBox, Pagination, ConfirmDialog, Toast } from "./shared-admin";
import { formatDate } from "../../api";
import { useAuth } from "../../auth";

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [data, setData] = useState<Paginated<User> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState<User | null>(null);

  const load = () => {
    api<Paginated<User>>(`/admin/users?page=${page}&pageSize=20`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [page]);

  const setStatus = async (u: User, status: "active" | "suspended") => {
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", body: { status } });
      load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/admin/users/${deleting.id}`, { method: "DELETE" });
      setDeleting(null); load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  if (!data) return error ? <ErrorBox message={error} /> : <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-zinc-500">{data.total} registered accounts</p>
      </div>
      {data.items.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">No users yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.items.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.id === me?.id && <span className="ml-2 text-xs text-zinc-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 capitalize">{u.role === "admin" && <Shield size={13} className="mr-1 inline text-brand-500" />}{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.status === "active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-500">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {u.id !== me?.id && u.role !== "admin" && (
                        u.status === "active" ? (
                          <button className="btn-ghost !p-2" title="Suspend" onClick={() => setStatus(u, "suspended")}><Ban size={15} /></button>
                        ) : (
                          <button className="btn-ghost !p-2" title="Restore" onClick={() => setStatus(u, "active")}><RotateCcw size={15} /></button>
                        )
                      )}
                      {u.id !== me?.id && u.role !== "admin" && (
                        <button className="btn-ghost !p-2 text-red-500" title="Delete" onClick={() => setDeleting(u)}><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination data={data} onPage={setPage} />
      <ConfirmDialog open={!!deleting} title="Delete user" message={`Permanently delete ${deleting?.username}? Their posts will be anonymized.`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
