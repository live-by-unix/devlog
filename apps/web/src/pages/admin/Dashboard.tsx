import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDate, type Paginated, type Release, type Newsletter } from "../../api";
import { Spinner, ErrorBox, StatusBadge } from "../../components/ui";

interface Stats {
  project: { name: string };
  counts: {
    releases: number; releasesPublished: number;
    newsletters: number; newslettersPublished: number;
    users: number; threads: number; replies: number; openReports: number;
  };
  recent: {
    releases: { id: string; name: string; version: string; status: string; updatedAt: string }[];
    newsletters: { id: string; title: string; status: string; updatedAt: string }[];
  };
  installation: { version: number; installedAt?: string };
  dataDir: string;
  settings: { maintenanceMode: boolean };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <Spinner />;

  const cards = [
    { label: "Releases", value: `${stats.counts.releasesPublished}/${stats.counts.releases}`, sub: "published / total" },
    { label: "Newsletters", value: `${stats.counts.newslettersPublished}/${stats.counts.newsletters}`, sub: "published / total" },
    { label: "Users", value: stats.counts.users, sub: "registered" },
    { label: "Threads", value: stats.counts.threads, sub: `${stats.counts.replies} replies` },
    { label: "Open reports", value: stats.counts.openReports, sub: "awaiting review" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-zinc-500">{stats.project.name || "Your project"} — installation v{stats.installation.version}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-zinc-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent releases</h2>
            <Link to="/admin/releases" className="text-sm text-brand-600 hover:underline dark:text-brand-400">Manage</Link>
          </div>
          {stats.recent.releases.length === 0 ? <p className="text-sm text-zinc-500">No releases yet.</p> : (
            <ul className="space-y-2 text-sm">
              {stats.recent.releases.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.name} <span className="font-mono text-xs text-zinc-500">v{r.version}</span></span>
                  <StatusBadge status={r.status as "draft" | "published"} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent newsletters</h2>
            <Link to="/admin/newsletters" className="text-sm text-brand-600 hover:underline dark:text-brand-400">Manage</Link>
          </div>
          {stats.recent.newsletters.length === 0 ? <p className="text-sm text-zinc-500">No newsletters yet.</p> : (
            <ul className="space-y-2 text-sm">
              {stats.recent.newsletters.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{n.title}</span>
                  <StatusBadge status={n.status as "draft" | "published"} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5 text-sm text-zinc-500">
        <p>Data directory: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">{stats.dataDir}</code></p>
        {stats.settings.maintenanceMode && <p className="mt-1 text-amber-600 dark:text-amber-400">Maintenance mode is enabled.</p>}
      </div>
    </div>
  );
}
