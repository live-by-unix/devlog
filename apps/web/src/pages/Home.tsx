import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, Github, Globe, Store, User as UserIcon, Newspaper, MessageSquare, MoreHorizontal } from "lucide-react";
import { api, mediaUrl, type Project, type ReleaseSummary, type NewsletterSummary } from "../api";
import { useAuth } from "../auth";
import { ReleaseCard, NewsletterCard, Spinner, ErrorBox, ExternalLinkBtn } from "../components/ui";

interface HomeData {
  project: Project;
  newsletters: NewsletterSummary[];
  releases: ReleaseSummary[];
  releaseCount: number;
  newsletterCount: number;
}

export default function Home() {
  const { status } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<HomeData>("/home").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="mx-auto max-w-6xl px-4 py-16"><ErrorBox message={error} /></div>;
  if (!data) return <Spinner />;

  const p = data.project;
  const licenseLabel = p.license === "Other" && p.customLicense ? p.customLicense : p.license;

  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">{p.type || "Software"}</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{p.name || "Welcome to Devlog"}</h1>
            {p.description && <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{p.description}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              {licenseLabel && <span className="badge bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{licenseLabel}</span>}
              {p.type && <span className="badge bg-brand-50 px-3 py-1 text-sm text-brand-700 dark:bg-brand-950 dark:text-brand-300">{p.type}</span>}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {p.websiteUrl && <ExternalLinkBtn href={p.websiteUrl}><Globe size={14} />Website</ExternalLinkBtn>}
              {p.repositoryUrl && <ExternalLinkBtn href={p.repositoryUrl}><Github size={14} />GitHub</ExternalLinkBtn>}
              {p.storeUrl && <ExternalLinkBtn href={p.storeUrl}><Store size={14} />Store</ExternalLinkBtn>}
              {data.releases.length > 0 && (
                <Link to="/releases" className="btn-primary"><Download size={16} />Download</Link>
              )}
            </div>
            {(p.author || p.developerGithub) && (
              <p className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
                <UserIcon size={14} />
                {p.author || "Developer"}
                {p.developerGithub && (
                  <> · <a href={p.developerGithub} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">GitHub profile</a></>
                )}
              </p>
            )}
          </div>
          {p.imagePath && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-card dark:border-zinc-800">
              <img src={mediaUrl(p.imagePath)} alt={p.name} className="w-full object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Newsletters */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><Newspaper size={22} className="text-brand-600 dark:text-brand-400" />Newsletters</h2>
          <Link to="/newsletters" className="btn-ghost text-sm">View all <ArrowRight size={14} /></Link>
        </div>
        {data.newsletters.length === 0 ? (
          <div className="card p-8 text-center text-zinc-500">No newsletters published yet.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.newsletters.map((n) => <NewsletterCard key={n.id} newsletter={n} />)}
          </div>
        )}
      </section>

      {/* Releases */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold"><Download size={22} className="text-brand-600 dark:text-brand-400" />Releases</h2>
          <div className="flex items-center gap-2">
            <Link to="/releases" className="btn-ghost text-sm">View all</Link>
            <div className="relative">
              <Link to="/releases" className="btn-ghost !px-2" aria-label="All releases"><MoreHorizontal size={18} /></Link>
            </div>
          </div>
        </div>
        {data.releases.length === 0 ? (
          <div className="card p-8 text-center text-zinc-500">No releases published yet.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.releases.map((r) => <ReleaseCard key={r.id} release={r} />)}
          </div>
        )}
      </section>

      {/* Discussions teaser */}
      <section className="mx-auto max-w-6xl px-4 pb-10">
        <Link to="/discussions" className="card flex items-center justify-between p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-brand-600 dark:text-brand-400" />
            <div>
              <p className="font-semibold">Join the discussion</p>
              <p className="text-sm text-zinc-500">Talk about releases and newsletters with the community.</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-zinc-400" />
        </Link>
      </section>
    </div>
  );
}
