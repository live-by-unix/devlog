import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Lock, ExternalLink, MessageSquare, FileText } from "lucide-react";
import { api, formatBytes, formatDate, type Release, type Newsletter } from "../api";
import { useAuth } from "../auth";
import { Markdown, Spinner, ErrorBox, StatusBadge, FileBadge } from "../components/ui";
import { ConfirmDialog } from "../components/Forms";

export default function ReleaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [release, setRelease] = useState<Release | null>(null);
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [error, setError] = useState("");
  const [confirmFile, setConfirmFile] = useState<string | null>(null);

  useEffect(() => {
    setRelease(null); setError("");
    api<{ release: Release }>(`/releases/${id}`)
      .then(async ({ release }) => {
        setRelease(release);
        if (release.newsletterId) {
          api<{ newsletter: Newsletter }>(`/newsletters/${release.newsletterId}`)
            .then((r) => setNewsletter(r.newsletter)).catch(() => {});
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-4xl px-4 py-16"><ErrorBox message={error} /></div>;
  if (!release) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav className="mb-4 text-sm text-zinc-500"><Link to="/releases" className="hover:underline">Releases</Link> / {release.name}</nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{release.name}</h1>
            <StatusBadge status={release.status} />
          </div>
          <p className="mt-1 font-mono text-lg text-zinc-500">v{release.version}</p>
        </div>
        <div className="text-sm text-zinc-500">Released {formatDate(release.publishedAt ?? release.updatedAt)}</div>
      </div>

      {newsletter && (
        <Link to={`/newsletters/${newsletter.id}`} className="card mt-6 flex items-center gap-3 border-brand-200 p-4 dark:border-brand-900">
          <FileText size={18} className="text-brand-600 dark:text-brand-400" />
          <div>
            <p className="text-xs text-zinc-500">Associated newsletter</p>
            <p className="font-medium">{newsletter.title}</p>
          </div>
        </Link>
      )}

      {release.githubUrl && (
        <a href={release.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-6">
          <ExternalLink size={15} />View on GitHub Releases
        </a>
      )}

      <article className="card mt-8 p-6 md:p-8">
        <Markdown content={release.description} />
      </article>

      {release.files.length > 0 && (
        <section className="card mt-8 overflow-hidden">
          <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold dark:border-zinc-800">Downloads</h2>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {release.files.map((f) => {
              const needsAuth = f.permission === "users" && !user;
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                  <Download size={18} className="shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.displayName}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(f.size)} · {formatDate(f.uploadedAt)}</p>
                  </div>
                  <FileBadge permission={f.permission} />
                  {needsAuth ? (
                    <Link to="/login" className="btn-outline text-sm"><Lock size={14} />Sign in to download</Link>
                  ) : (
                    <a href={`/api/v1/releases/${release.id}/files/${f.id}/download`} className="btn-primary text-sm" onClick={(e) => {
                      // For signed-in-only files on browsers, direct link is fine (cookie auth).
                      void e;
                    }}>
                      <Download size={14} />Download
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare size={18} />Discussion</h2>
        <p className="mt-2 text-sm text-zinc-500">Talk about this release with the community.</p>
        <Link to={`/discussions/releases/${release.id}`} className="btn-primary mt-4">Open discussion</Link>
      </section>

      {confirmFile && (
        <ConfirmDialog open title="Download file" message="This file requires sign-in." confirmLabel="Go to sign in" onConfirm={() => { window.location.href = "/login"; }} onCancel={() => setConfirmFile(null)} danger={false} />
      )}
    </div>
  );
}
