import { useEffect } from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import { Header, Footer } from "./components/Layout";
import { AuthProvider, useAuth } from "./auth";
import { ThemeProvider } from "./theme";
import Setup from "./pages/Setup";
import Home from "./pages/Home";
import Releases from "./pages/Releases";
import ReleaseDetail from "./pages/ReleaseDetail";
import Newsletters from "./pages/Newsletters";
import NewsletterDetail from "./pages/NewsletterDetail";
import DiscussionsIndex from "./pages/DiscussionsIndex";
import { DiscussionBoard, ThreadDetail } from "./pages/Discussions";
import { Login, Register } from "./pages/AuthPages";
import Account from "./pages/Account";
import { NotFound, Forbidden, ServerError } from "./pages/Errors";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import ProjectSettings from "./pages/admin/ProjectSettings";
import ReleasesAdmin from "./pages/admin/ReleasesAdmin";
import ReleaseForm from "./pages/admin/ReleaseForm";
import NewslettersAdmin from "./pages/admin/NewslettersAdmin";
import NewsletterForm from "./pages/admin/NewsletterForm";
import DiscussionsAdmin from "./pages/admin/DiscussionsAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import SettingsAdmin from "./pages/admin/SettingsAdmin";
import { Spinner } from "./components/ui";

function TitleUpdater() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => {
    const name = status?.project.name;
    const titles: Record<string, string> = {
      "/": "Home",
      "/releases": "Releases",
      "/newsletters": "Newsletters",
      "/discussions": "Discussions",
      "/login": "Sign in",
      "/register": "Register",
      "/account": "Account",
      "/admin": "Admin",
    };
    const base = name || "Devlog";
    const section = Object.keys(titles).find((k) => k !== "/" && pathname.startsWith(k));
    document.title = section ? `${titles[section]} — ${base}` : pathname === "/" ? base : `Devlog`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && name) desc.setAttribute("content", `${name} — ${status?.project.name ? "software project" : "Devlog"}`);
  }, [pathname, status]);
  return null;
}

function Shell() {
  const { status, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner label="Loading Devlog…" /></div>;
  }
  if (status && (status.needsSetup ?? !status.initialized)) {
    return <Setup />;
  }

  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdmin && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/releases" element={<Releases />} />
          <Route path="/releases/:id" element={<ReleaseDetail />} />
          <Route path="/newsletters" element={<Newsletters />} />
          <Route path="/newsletters/:id" element={<NewsletterDetail />} />
          <Route path="/discussions" element={<DiscussionsIndex />} />
          <Route path="/discussions/releases/:targetId" element={<BoardRoute scope="release" />} />
          <Route path="/discussions/newsletters/:targetId" element={<BoardRoute scope="newsletter" />} />
          <Route path="/discussions/:scope/:targetId/:threadId" element={<ThreadRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<Account />} />
          <Route path="/403" element={<Forbidden />} />
          <Route path="/500" element={<ServerError />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="project" element={<ProjectSettings />} />
            <Route path="releases" element={<ReleasesAdmin />} />
            <Route path="releases/new" element={<ReleaseForm />} />
            <Route path="releases/:id/edit" element={<ReleaseForm />} />
            <Route path="newsletters" element={<NewslettersAdmin />} />
            <Route path="newsletters/new" element={<NewsletterForm />} />
            <Route path="newsletters/:id/edit" element={<NewsletterForm />} />
            <Route path="discussions" element={<DiscussionsAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="settings" element={<SettingsAdmin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}

function BoardRoute({ scope }: { scope: "release" | "newsletter" }) {
  const { targetId } = useParams();
  return <DiscussionBoard scope={scope} targetId={targetId!} />;
}

function ThreadRoute() {
  const { threadId } = useParams();
  return <ThreadDetail threadId={threadId!} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TitleUpdater />
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
