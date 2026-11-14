import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Paginated, type NewsletterSummary } from "../api";
import { NewsletterCard, Pagination, Spinner, EmptyState, ErrorBox } from "../components/ui";

export default function Newsletters() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get("page") ?? "1", 10) || 1;
  const [data, setData] = useState<Paginated<NewsletterSummary> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api<Paginated<NewsletterSummary>>(`/newsletters?page=${page}&pageSize=12`)
      .then(setData).catch((e) => setError(e.message));
  }, [page]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Newsletters</h1>
      <p className="mt-2 text-zinc-500">Updates, announcements and deep dives.</p>
      {error && <div className="mt-6"><ErrorBox message={error} /></div>}
      {!data && !error && <Spinner />}
      {data && data.items.length === 0 && <div className="mt-8"><EmptyState title="No newsletters yet" hint="Check back soon." /></div>}
      {data && data.items.length > 0 && (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((n) => <NewsletterCard key={n.id} newsletter={n} />)}
          </div>
          <Pagination data={data} onPage={(p) => setParams({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
