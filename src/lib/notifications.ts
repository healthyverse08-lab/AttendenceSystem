import { supabase } from './supabase';
import type { NotificationType } from '@/types';

// ============================================================
// Reusable Notification Service
// Centralized notification creation for all modules.
// Future-ready for email and push notifications.
// ============================================================

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body?: string;
  type?: NotificationType;
}

export async function createNotification(input: CreateNotificationInput) {
  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
    type: input.type ?? 'info',
  });
  if (error) console.error('Failed to create notification:', error.message);
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  const { error } = await supabase.from('notifications').insert(
    inputs.map((i) => ({
      user_id: i.userId,
      title: i.title,
      body: i.body ?? null,
      type: i.type ?? 'info',
    }))
  );
  if (error) console.error('Failed to create notifications:', error.message);
}

export async function notifyStudents(
  studentUserIds: string[],
  title: string,
  body?: string,
  type: NotificationType = 'attendance'
) {
  await createNotifications(studentUserIds.map((uid) => ({ userId: uid, title, body, type })));
}

export async function notifyUser(
  userId: string,
  title: string,
  body?: string,
  type: NotificationType = 'info'
) {
  await createNotification({ userId, title, body, type });
}
