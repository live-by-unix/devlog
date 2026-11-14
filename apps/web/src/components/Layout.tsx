import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, User, LogOut, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import { mediaUrl } from "../api";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/releases", label: "Releases" },
  { to: "/newsletters", label: "Newsletters" },
  { to: "/discussions", label: "Discussions" },
];

export function Header() {
  const { user, status, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const projectName = status?.project.name || "Devlog";
  const favicon = status?.project.faviconPath ? mediaUrl(status.project.faviconPath) : "/favicon.svg";

  const doLogout = async () => {
    setMenu(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5 font-semibold">
          <img src={favicon} alt="" className="h-7 w-7 rounded" />
          <span className="truncate">{projectName}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggle} className="btn-ghost !px-2.5" aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="btn-ghost gap-1.5">
                <User size={16} />
                <span className="hidden max-w-28 truncate sm:inline">{user.username}</span>
                <ChevronDown size={14} />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    <Link to="/account" onClick={() => setMenu(false)} className="block px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">Account</Link>
                    {user.role === "admin" && (
                      <Link to="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Shield size={14} /> Admin dashboard
                      </Link>
                    )}
                    <button onClick={doLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
              <Link to="/register" className="btn-primary">Register</Link>
            </>
          )}
          <button className="btn-ghost !px-2.5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}>
              {n.label}
            </NavLink>
          ))}
          {!user && <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm">Sign in</Link>}
        </nav>
      )}
      {status?.maintenance && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          This site is currently under maintenance.
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { status } = useAuth();
  return (
    <footer className="mt-20 border-t border-zinc-200 py-8 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-sm text-zinc-500">
        <span>© {new Date().getFullYear()} {status?.project.name || "Devlog"}</span>
        <span>Powered by <span className="font-medium">Devlog</span> — self-hosted project publishing</span>
      </div>
    </footer>
  );
}
