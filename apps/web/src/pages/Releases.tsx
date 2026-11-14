import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Paginated, type ReleaseSummary } from "../api";
import { ReleaseCard, Pagination, Spinner, EmptyState, ErrorBox } from "../components/ui";

export default function Releases() {
  const [params, setParams] = useSearchParams();
  const page = parseInt(params.get("page") ?? "1", 10) || 1;
  const [data, setData] = useState<Paginated<ReleaseSummary> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api<Paginated<ReleaseSummary>>(`/releases?page=${page}&pageSize=12`)
      .then(setData).catch((e) => setError(e.message));
  }, [page]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Releases</h1>
      <p className="mt-2 text-zinc-500">All published releases.</p>
      {error && <div className="mt-6"><ErrorBox message={error} /></div>}
      {!data && !error && <Spinner />}
      {data && data.items.length === 0 && <div className="mt-8"><EmptyState title="No releases yet" hint="Check back soon." /></div>}
      {data && data.items.length > 0 && (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((r) => <ReleaseCard key={r.id} release={r} />)}
          </div>
          <Pagination data={data} onPage={(p) => setParams({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
