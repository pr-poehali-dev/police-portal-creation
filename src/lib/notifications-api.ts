import { auth } from './auth';

const NOTIFICATIONS_API_URL = 'https://functions.poehali.dev/88a90882-f9c8-4ce1-9aeb-aab3b1a519ce';

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  created_at: string;
  related_crew_id?: number;
  related_bolo_id?: number;
}

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    const response = await fetch(NOTIFICATIONS_API_URL, {
      method: 'GET',
      headers: { ...auth.getAuthHeader() },
    });

    if (!response.ok) throw new Error('Failed to fetch notifications');

    const data = await response.json();
    return data.notifications;
  },

  async create(notification: {
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    related_crew_id?: number;
    related_bolo_id?: number;
  }): Promise<{ id: number; created_at: string }> {
    const response = await fetch(NOTIFICATIONS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify(notification),
    });

    if (!response.ok) throw new Error('Failed to create notification');

    return response.json();
  },

  async markAsRead(notificationId: number): Promise<void> {
    const response = await fetch(NOTIFICATIONS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeader() },
      body: JSON.stringify({ notification_id: notificationId }),
    });

    if (!response.ok) throw new Error('Failed to mark notification as read');
  },
};
