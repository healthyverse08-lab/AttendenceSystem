import { motion } from 'framer-motion';
import { Bell, CheckCheck, Inbox, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useLecturerNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
} from '../hooks/useLecturerQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/features/administrator/components/EmptyState';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
  emergency: AlertCircle,
  attendance: CheckCircle2,
  leave: Inbox,
  system: Bell,
};

const TYPE_ACCENTS: Record<NotificationType, string> = {
  info: 'bg-sky-50 text-sky-600',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-rose-50 text-rose-600',
  success: 'bg-emerald-50 text-emerald-600',
  emergency: 'bg-rose-100 text-rose-700',
  attendance: 'bg-emerald-50 text-emerald-600',
  leave: 'bg-violet-50 text-violet-600',
  system: 'bg-slate-100 text-slate-600',
};

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useLecturerNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" description="Stay updated on your attendance sessions and system alerts." />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on your attendance sessions and system alerts."
        actions={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You'll be notified about attendance sessions, leave applications, and system updates here."
          icon={<Bell className="h-6 w-6" strokeWidth={1.5} />}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card className={cn(
                  'transition-colors',
                  !n.is_read ? 'border-sky-200 bg-sky-50/30' : 'border-slate-200 bg-white'
                )}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', TYPE_ACCENTS[n.type] ?? TYPE_ACCENTS.info)}>
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm', n.is_read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900')}>
                          {n.title}
                        </p>
                        <span className="flex-shrink-0 text-xs text-slate-400">{formatTime(n.created_at)}</span>
                      </div>
                      {n.body && <p className="mt-1 text-sm text-slate-500">{n.body}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{n.type}</Badge>
                        {!n.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => markRead.mutate(n.id)}
                            disabled={markRead.isPending}
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                    {!n.is_read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
