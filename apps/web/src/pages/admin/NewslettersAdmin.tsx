import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { api, type Paginated, type Newsletter } from "../../api";
import { Spinner, ErrorBox, StatusBadge, Pagination, ConfirmDialog, Toast } from "./shared-admin";

export default function NewslettersAdmin() {
  const [data, setData] = useState<Paginated<Newsletter> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState<Newsletter | null>(null);

  const load = () => {
    api<Paginated<Newsletter>>(`/admin/newsletters?page=${page}&pageSize=20`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [page]);

  const toggleStatus = async (n: Newsletter) => {
    try {
      await api(`/admin/newsletters/${n.id}/status`, { method: "PATCH", body: { status: n.status === "published" ? "draft" : "published" } });
      load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/admin/newsletters/${deleting.id}`, { method: "DELETE" });
      setDeleting(null); load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Failed"); }
  };

  if (!data) return error ? <ErrorBox message={error} /> : <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Newsletters</h1>
          <p className="text-sm text-zinc-500">{data.total} total</p>
        </div>
        <Link to="/admin/newsletters/new" className="btn-primary"><Plus size={16} />New newsletter</Link>
      </div>
      {data.items.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">No newsletters yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.items.map((n) => (
                <tr key={n.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-3 text-zinc-500">{n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(n.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {n.status === "published" && (
                        <Link to={`/newsletters/${n.id}`} className="btn-ghost !p-2" title="View"><ExternalLink size={15} /></Link>
                      )}
                      <Link to={`/admin/newsletters/${n.id}/edit`} className="btn-ghost !p-2" title="Edit"><Pencil size={15} /></Link>
                      <button className="btn-ghost !p-2" onClick={() => toggleStatus(n)}>{n.status === "published" ? "Unpublish" : "Publish"}</button>
                      <button className="btn-ghost !p-2 text-red-500" onClick={() => setDeleting(n)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination data={data} onPage={setPage} />
      <ConfirmDialog open={!!deleting} title="Delete newsletter" message={`Delete "${deleting?.title}"? Its discussion threads will also be removed.`} onConfirm={remove} onCancel={() => setDeleting(null)} />
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
