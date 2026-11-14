import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { api, type Paginated, type Release } from "../../api";
import { Spinner, ErrorBox, StatusBadge, Pagination, ConfirmDialog, Toast } from "./shared-admin";

export default function ReleasesAdmin() {
  const [data, setData] = useState<Paginated<Release> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState<Release | null>(null);

  const load = () => {
    api<Paginated<Release>>(`/admin/releases?page=${page}&pageSize=20`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [page]);

  const toggleStatus = async (r: Release) => {
    try {
      await api(`/admin/releases/${r.id}/status`, { method: "PATCH", body: { status: r.status === "published" ? "draft" : "published" } });
      load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/admin/releases/${deleting.id}`, { method: "DELETE" });
      setDeleting(null); load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  if (!data) return error ? <ErrorBox message={error} /> : <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-sm text-zinc-500">{data.total} total</p>
        </div>
        <Link to="/admin/releases/new" className="btn-primary"><Plus size={16} />New release</Link>
      </div>
      {data.items.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">No releases yet. Create your first one.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Files</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">v{r.version}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">{r.files.length}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(r.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {r.status === "published" && (
                        <Link to={`/releases/${r.id}`} className="btn-ghost !p-2" title="View public page"><ExternalLink size={15} /></Link>
                      )}
                      <Link to={`/admin/releases/${r.id}/edit`} className="btn-ghost !p-2" title="Edit"><Pencil size={15} /></Link>
                      <button className="btn-ghost !p-2" title={r.status === "published" ? "Unpublish" : "Publish"} onClick={() => toggleStatus(r)}>
                        {r.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button className="btn-ghost !p-2 text-red-500" title="Delete" onClick={() => setDeleting(r)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination data={data} onPage={setPage} />
      <ConfirmDialog open={!!deleting} title="Delete release" message={`Delete "${deleting?.name}" and all its files? This cannot be undone.`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
