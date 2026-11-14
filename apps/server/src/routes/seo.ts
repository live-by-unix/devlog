import { Router } from "express";
import { getDb } from "../storage/db.js";
import { config } from "../config.js";

export const seoRouter = Router();

function baseUrl(req: { protocol: string; get(name: string): string | undefined }): string {
  const host = req.get("host") ?? "localhost";
  const proto = req.protocol;
  return `${proto}://${host}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripMd(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function rssFeed(items: { title: string; link: string; pubDate?: string; description: string }[], title: string, description: string) {
  const xmlItems = items.map((i) => `    <item>
      <title>${esc(i.title)}</title>
      <link>${esc(i.link)}</link>
      <guid>${esc(i.link)}</guid>
      ${i.pubDate ? `<pubDate>${new Date(i.pubDate).toUTCString()}</pubDate>` : ""}
      <description>${esc(i.description)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(items[0]?.link ?? "")}</link>
    <description>${esc(description)}</description>
    <language>en</language>
${xmlItems}
  </channel>
</rss>`;
}

seoRouter.get("/robots.txt", (req, res) => {
  const base = baseUrl(req);
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /account\n\nSitemap: ${base}/sitemap.xml\n`);
});

seoRouter.get("/sitemap.xml", (req, res) => {
  const db = getDb();
  const base = baseUrl(req);
  const urls: string[] = ["/", "/releases", "/newsletters", "/discussions"];
  for (const r of db.releases.get().filter((x) => x.status === "published")) {
    urls.push(`/releases/${r.id}`, `/discussions/releases/${r.id}`);
  }
  for (const n of db.newsletters.get().filter((x) => x.status === "published")) {
    urls.push(`/newsletters/${n.id}`, `/discussions/newsletters/${n.id}`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join("\n")}
</urlset>`;
  res.type("application/xml").send(xml);
});

seoRouter.get("/feed/releases.xml", (req, res) => {
  const db = getDb();
  const base = baseUrl(req);
  const items = db.releases.get()
    .filter((r) => r.status === "published")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 50)
    .map((r) => ({
      title: `${r.name} ${r.version}`,
      link: `${base}/releases/${r.id}`,
      pubDate: r.publishedAt ?? r.updatedAt,
      description: stripMd(r.description),
    }));
  res.type("application/rss+xml").send(rssFeed(items, `${db.project.get().name} Releases`, `Releases for ${db.project.get().name}`));
});

seoRouter.get("/feed/newsletters.xml", (req, res) => {
  const db = getDb();
  const base = baseUrl(req);
  const items = db.newsletters.get()
    .filter((n) => n.status === "published")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 50)
    .map((n) => ({
      title: n.title,
      link: `${base}/newsletters/${n.id}`,
      pubDate: n.publishedAt ?? n.updatedAt,
      description: n.description || stripMd(n.content),
    }));
  res.type("application/rss+xml").send(rssFeed(items, `${db.project.get().name} Newsletters`, `Newsletters for ${db.project.get().name}`));
});

export function seoMetaTags(projectName: string) {
  return { projectName };
}
