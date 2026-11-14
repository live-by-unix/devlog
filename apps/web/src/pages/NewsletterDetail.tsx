import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { api, mediaUrl, formatDate, type Newsletter } from "../api";
import { Markdown, Spinner, ErrorBox } from "../components/ui";

export default function NewsletterDetail() {
  const { id } = useParams();
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setNewsletter(null); setError("");
    api<{ newsletter: Newsletter }>(`/newsletters/${id}`)
      .then((r) => setNewsletter(r.newsletter))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorBox message={error} /></div>;
  if (!newsletter) return <Spinner />;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-4 text-sm text-zinc-500"><Link to="/newsletters" className="hover:underline">Newsletters</Link> / {newsletter.title}</nav>
      {newsletter.imagePath && (
        <img src={mediaUrl(newsletter.imagePath)} alt="" className="mb-6 w-full rounded-2xl border border-zinc-200 object-cover dark:border-zinc-800" />
      )}
      <h1 className="text-3xl font-bold md:text-4xl">{newsletter.title}</h1>
      <p className="mt-2 text-sm text-zinc-500">{formatDate(newsletter.publishedAt ?? newsletter.updatedAt)}</p>
      {newsletter.description && <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{newsletter.description}</p>}
      <div className="card mt-8 p-6 md:p-8">
        <Markdown content={newsletter.content} />
      </div>
      <section className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare size={18} />Discussion</h2>
        <p className="mt-2 text-sm text-zinc-500">Discuss this newsletter with the community.</p>
        <Link to={`/discussions/newsletters/${newsletter.id}`} className="btn-primary mt-4">Open discussion</Link>
      </section>
    </article>
  );
}
