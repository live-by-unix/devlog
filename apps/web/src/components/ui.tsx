import { Link } from "react-router-dom";
import { Download, MessageSquare, ExternalLink, Lock } from "lucide-react";
import type { ReleaseSummary, NewsletterSummary, Thread, Paginated } from "../api";
import { formatBytes, formatDate, mediaUrl } from "../api";
import { Markdown } from "./Markdown";

/* --------------------------------- badges ---------------------------------- */

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published"
    ? <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">Published</span>
    : <span className="badge bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Draft</span>;
}

export function FileBadge({ permission }: { permission: "everyone" | "users" }) {
  return permission === "users"
    ? <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"><Lock size={11} className="mr-1" />Sign-in required</span>
    : <span className="badge bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Public</span>;
}

/* ---------------------------------- cards ---------------------------------- */

export function ReleaseCard({ release }: { release: ReleaseSummary }) {
  const excerpt = (release.descriptionExcerpt ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return (
    <Link to={`/releases/${release.id}`} className="card group flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-400">{release.name}</h3>
          <p className="mt-0.5 font-mono text-sm text-zinc-500">v{release.version}</p>
        </div>
        <StatusBadge status={release.status} />
      </div>
      {excerpt && <p className="mt-3 line-clamp-3 flex-1 text-sm text-zinc-600 dark:text-zinc-400">{excerpt}</p>}
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>{formatDate(release.publishedAt ?? release.updatedAt)}</span>
        <span className="flex items-center gap-3">
          {release.fileCount ? <span className="flex items-center gap-1"><Download size={13} />{release.fileCount}</span> : null}
          <span className="flex items-center gap-1"><MessageSquare size={13} />Discussion</span>
        </span>
      </div>
    </Link>
  );
}

export function NewsletterCard({ newsletter }: { newsletter: NewsletterSummary }) {
  return (
    <Link to={`/newsletters/${newsletter.id}`} className="card group overflow-hidden transition-shadow hover:shadow-md">
      {newsletter.imagePath ? (
        <img src={mediaUrl(newsletter.imagePath)} alt="" className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 text-4xl font-bold text-white/90">
          {newsletter.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="p-5">
        <h3 className="font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-400">{newsletter.title}</h3>
        {newsletter.description && <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{newsletter.description}</p>}
        <p className="mt-3 text-xs text-zinc-500">{formatDate(newsletter.publishedAt ?? newsletter.updatedAt)}</p>
      </div>
    </Link>
  );
}

export function ThreadRow({ thread, targetLabel }: { thread: Thread; targetLabel?: string }) {
  return (
    <Link to={`/discussions/${thread.scope}/${thread.targetId}/${thread.id}`} className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{thread.title}</h3>
          {thread.locked && <span className="badge bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Locked</span>}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          by {thread.authorUsername} · {formatDate(thread.createdAt)}
          {targetLabel ? ` · ${targetLabel}` : ""}
        </p>
      </div>
      <span className="flex items-center gap-1 text-sm text-zinc-500"><MessageSquare size={15} />{thread.replyCount}</span>
    </Link>
  );
}

/* -------------------------------- pagination -------------------------------- */

export function Pagination({ data, onPage, basePath }: { data: Paginated<unknown> | null; onPage?: (p: number) => void; basePath?: string }) {
  if (!data || data.totalPages <= 1) return null;
  const pages = Array.from({ length: data.totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === data.totalPages || Math.abs(p - data.page) <= 2);
  const btn = "btn-secondary !px-3 !py-1.5 text-sm";
  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {data.page > 1 && (
        onPage
          ? <button className={btn} onClick={() => onPage(data.page - 1)}>Prev</button>
          : <Link className={btn} to={`${basePath}?page=${data.page - 1}`}>Prev</Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="text-zinc-400">…</span>}
          {onPage ? (
            <button onClick={() => onPage(p)} className={`${btn} ${p === data.page ? "!bg-brand-600 !text-white" : ""}`}>{p}</button>
          ) : (
            <Link to={`${basePath}?page=${p}`} className={`${btn} ${p === data.page ? "!bg-brand-600 !text-white" : ""}`}>{p}</Link>
          )}
        </span>
      ))}
      {data.page < data.totalPages && (
        onPage
          ? <button className={btn} onClick={() => onPage(data.page + 1)}>Next</button>
          : <Link className={btn} to={`${basePath}?page=${data.page + 1}`}>Next</Link>
      )}
    </nav>
  );
}

/* --------------------------------- misc ------------------------------------ */

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {hint && <p className="text-sm text-zinc-500">{hint}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{message}</div>;
}

export function ExternalLinkBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm">
      <ExternalLink size={14} />{children}
    </a>
  );
}

export { Markdown };
