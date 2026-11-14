import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, Download, Newspaper } from "lucide-react";
import { api, type ReleaseSummary, type NewsletterSummary } from "../api";
import { Spinner, ErrorBox } from "../components/ui";

export default function DiscussionsIndex() {
  const [releases, setReleases] = useState<ReleaseSummary[] | null>(null);
  const [newsletters, setNewsletters] = useState<NewsletterSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ items: ReleaseSummary[] }>("/releases?pageSize=100"),
      api<{ items: NewsletterSummary[] }>("/newsletters?pageSize=100"),
    ]).then(([r, n]) => { setReleases(r.items); setNewsletters(n.items); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="mx-auto max-w-4xl px-4 py-16"><ErrorBox message={error} /></div>;
  if (!releases || !newsletters) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Discussions</h1>
      <p className="mt-2 text-zinc-500">Each release and newsletter has its own discussion board.</p>

      <h2 className="mt-10 flex items-center gap-2 text-xl font-semibold"><Download size={20} className="text-brand-600 dark:text-brand-400" />Release discussions</h2>
      {releases.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No published releases yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {releases.map((r) => (
            <Link key={r.id} to={`/discussions/releases/${r.id}`} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
              <MessageSquare size={18} className="text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name} <span className="font-mono text-sm text-zinc-500">v{r.version}</span></p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-10 flex items-center gap-2 text-xl font-semibold"><Newspaper size={20} className="text-brand-600 dark:text-brand-400" />Newsletter discussions</h2>
      {newsletters.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No published newsletters yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {newsletters.map((n) => (
            <Link key={n.id} to={`/discussions/newsletters/${n.id}`} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
              <MessageSquare size={18} className="text-zinc-400" />
              <p className="min-w-0 flex-1 truncate font-medium">{n.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
