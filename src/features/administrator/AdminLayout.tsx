import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { ADMIN_NAV, NAV_GROUPS } from './navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminLayout() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-slate-900 text-slate-100 lg:hidden"
            >
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto bg-slate-900 text-slate-100 lg:block">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search students, lecturers, subjects…"
              className="pl-9 bg-slate-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) navigate(`/admin/search?q=${encodeURIComponent(q)}`);
                }
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-slate-600" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-sm text-slate-500">No new notifications</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100">
                  {user?.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt={user.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
                      {user?.full_name?.charAt(0) ?? 'A'}
                    </div>
                  )}
                  <span className="hidden text-sm font-medium sm:block">{user?.full_name}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium">{user?.full_name}</span>
                  <span className="text-xs font-normal capitalize text-slate-500">{role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                  className="text-rose-600 focus:text-rose-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500">
          <GraduationCap className="h-5 w-5 text-white" strokeWidth={1.5} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">TSAMS</p>
          <p className="text-xs text-slate-400">Administrator</p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="mb-4">
            <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              {group}
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV.filter((n) => n.group === group).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
