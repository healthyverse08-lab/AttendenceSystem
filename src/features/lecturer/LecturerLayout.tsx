import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/authentication/AuthContext';
import { LECTURER_NAV, LECTURER_NAV_GROUPS } from './navigation';
import { useLecturerUnreadNotifications } from './hooks/useLecturerQueries';
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

export function LecturerLayout() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: unread = [] } = useLecturerUnreadNotifications();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto bg-slate-900 text-slate-100 lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {unread.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                      {unread.length > 9 ? '9+' : unread.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-xs font-normal text-slate-500">{unread.length} unread</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {unread.length === 0 ? (
                  <DropdownMenuItem className="text-sm text-slate-500">You're all caught up</DropdownMenuItem>
                ) : (
                  unread.slice(0, 6).map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
                      <span className="text-sm font-medium text-slate-800">{n.title}</span>
                      {n.body && <span className="text-xs text-slate-500 line-clamp-2">{n.body}</span>}
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/lecturer/notifications')}>
                  View all notifications
                </DropdownMenuItem>
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
                      {user?.full_name?.charAt(0) ?? 'L'}
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
                <DropdownMenuItem onClick={() => navigate('/lecturer/profile')}>
                  My Profile
                </DropdownMenuItem>
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
      <Link to="/lecturer" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500">
          <GraduationCap className="h-5 w-5 text-white" strokeWidth={1.5} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">TSAMS</p>
          <p className="text-xs text-slate-400">Lecturer</p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {LECTURER_NAV_GROUPS.map((group) => (
          <div key={group} className="mb-4">
            <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              {group}
            </p>
            <div className="space-y-0.5">
              {LECTURER_NAV.filter((n) => n.group === group).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/lecturer'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300'
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
