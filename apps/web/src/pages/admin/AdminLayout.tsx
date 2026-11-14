import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderCog, Package, Newspaper, MessagesSquare, Users, Settings,
} from "lucide-react";
import { useAuth } from "../../auth";
import { Spinner } from "../../components/ui";
import { Link } from "react-router-dom";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/project", label: "Project", icon: FolderCog },
  { to: "/admin/releases", label: "Releases", icon: Package },
  { to: "/admin/newsletters", label: "Newsletters", icon: Newspaper },
  { to: "/admin/discussions", label: "Discussions", icon: MessagesSquare },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return <Spinner />;
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }
  if (user.role !== "admin") {
    navigate("/", { replace: true });
    return null;
  }
  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <RequireAdmin>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <nav className="card flex gap-1 overflow-x-auto p-2 md:flex-col">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-600 text-white" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}>
                <Icon size={16} />{label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </RequireAdmin>
  );
}
