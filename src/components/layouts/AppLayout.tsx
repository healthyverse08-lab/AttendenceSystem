import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap, LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/authentication/AuthContext';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children?: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500">
              <GraduationCap className="h-5 w-5 text-white" strokeWidth={1.5} />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">TSAMS</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user?.full_name}</p>
              <p className="text-xs capitalize text-slate-500">{role ?? ''}</p>
            </div>
            {user?.profile_picture_url && (
              <img
                src={user.profile_picture_url}
                alt={user.full_name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
              />
            )}
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
          isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
